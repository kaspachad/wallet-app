const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const net = require('net');
const util = require('util');
const execPromise = util.promisify(exec);

// Helper function to get a random available port
function getAvailablePort(base = 20000) {
  return base + Math.floor(Math.random() * 1000);
}

// Check if a port is already in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer().listen(port);
    server.on('listening', () => {
      server.close();
      resolve(false); // Port is not in use
    });
    server.on('error', () => {
      resolve(true); // Port is in use
    });
  });
}

// Function to start wallet daemon
function startWalletDaemon(keysFile, password, port) {
  return new Promise(async (resolve) => {
    try {
      // Check if port is already in use
      const portInUse = await isPortInUse(port);
      if (portInUse) {
        console.log(`Port ${port} already in use. Daemon might be running already.`);
        resolve({ success: false, message: 'Port already in use' });
        return;
      }

      console.log(`Attempting to start kaspawallet daemon on port ${port}...`);
      console.log(`Using keys file: ${keysFile}`);
      console.log(`Connecting to node RPC at: 127.0.0.1:16110`);
      
      // Start the daemon process
      const daemon = spawn('kaspawallet', [
        'start-daemon',
        '-f', keysFile,
        '-p', password,
        '-s', '127.0.0.1:16110', // Node RPC address
        '-l', `127.0.0.1:${port}` // Daemon listen address
      ]);

      let stdoutData = '';
      let stderrData = '';

      daemon.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutData += output;
        console.log(`Daemon stdout: ${output}`);
      });

      daemon.stderr.on('data', (data) => {
        const output = data.toString();
        stderrData += output;
        console.error(`Daemon stderr: ${output}`);
      });

      // Wait a moment to capture initial output and detect early errors
      setTimeout(() => {
        if (stderrData.includes('Error') || stderrData.includes('error')) {
          if (stderrData.includes('address already in use')) {
            console.log('Daemon appears to be already running on this port.');
            resolve({ success: true, message: 'Daemon already running' });
          } else {
            console.error('Daemon failed to start:', stderrData);
            resolve({ success: false, message: stderrData });
          }
        } else {
          console.log('Daemon appears to be starting successfully.');
          resolve({ success: true, message: 'Daemon started successfully' });
        }
      }, 2000);

      daemon.on('close', (code) => {
        console.log(`Daemon exited with code ${code}`);
        if (code !== 0) {
          resolve({ success: false, message: `Daemon exited with code ${code}` });
        }
      });

      daemon.on('error', (err) => {
        console.error('Daemon error:', err);
        resolve({ success: false, message: err.message });
      });
    } catch (error) {
      console.error('Exception starting daemon:', error);
      resolve({ success: false, message: error.message });
    }
  });
}

// Function to check balance
async function checkBalance(port, res) {
  return new Promise((resolve) => {
    console.log(`Checking balance for daemon on port ${port}...`);
    
    const cmd = `kaspawallet balance -v --daemonaddress 127.0.0.1:${port}`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        // If we got a "not synced yet" error, wait and try again
        if (stderr && stderr.includes('not synced yet')) {
          console.log('Wallet daemon not synced yet, waiting to retry...');
          setTimeout(() => checkBalance(port, res), 3000); // Retry after 3 seconds
          return;
        }
        
        console.error('Balance check error:', error, stderr);
        res.status(500).json({ message: 'Error fetching balance', error: stderr });
        resolve();
        return;
      }

      console.log('💰 Balance output:\n', stdout);
      
      // Parse the balance output for easier frontend processing
      let parsedBalance = null;
      
      // Try to match "Total balance, KAS X.XXXXX" format
      const totalMatch = stdout.match(/Total balance, KAS\s+(\d+\.\d+)/);
      if (totalMatch && totalMatch[1]) {
        parsedBalance = parseFloat(totalMatch[1]);
      } else {
        // Try to match address with balance format
        const addressMatch = stdout.match(/kaspa:.+?\s+(\d+\.\d+)\s/);
        if (addressMatch && addressMatch[1]) {
          parsedBalance = parseFloat(addressMatch[1]);
        }
      }
      
      res.json({ 
        balance: stdout,
        parsedBalance: parsedBalance !== null ? parsedBalance : 0,
        formattedBalance: parsedBalance !== null ? `${parsedBalance.toFixed(8)} KAS` : '0 KAS'
      });
      
      resolve();
    });
  });
}

// Create a new wallet
router.post('/wallet/create', async (req, res) => {
  const db = req.db;
  const user = req.session.user;
  const walletPassword = req.body.password;

  if (!user || !walletPassword) {
    return res.status(400).json({ message: 'Missing session or password' });
  }

  // Store wallet password in session for API calls
  req.session.walletPassword = walletPassword;
  
  // Generate a unique port for this wallet daemon
  const port = getAvailablePort();
  
  // Create a unique path for wallet keys file
  const keysFile = path.resolve(__dirname, `../wallets/${user.username}_${Date.now()}_keys.json`);
  
  // Hash the password for storage
  const hashedPassword = await bcrypt.hash(walletPassword, 10);

  console.log(`Creating wallet for user ${user.username} at ${keysFile}`);

  // Use kaspawallet CLI to create a new wallet
  const createCmd = `kaspawallet create -f "${keysFile}" -p ${walletPassword} -y`;
  console.log('Running:', createCmd);

  exec(createCmd, async (error, stdout, stderr) => {
    if (error) {
      console.error('Wallet creation failed:', stderr);
      return res.status(500).json({ message: 'Wallet creation failed: ' + stderr });
    }

    console.log('Wallet created, extracting seed phrase...');

    // Extract the seed phrase from the wallet
    const dumpCmd = `kaspawallet dump-unencrypted-data -f "${keysFile}" -p ${walletPassword} -y`;
    exec(dumpCmd, async (err, dumpOut, dumpErr) => {
      if (err) {
        console.error('Error extracting seed phrase:', dumpErr);
        return res.status(500).json({ message: 'Error extracting seed phrase' });
      }

      // Extract the seed phrase using regex
      const seedMatch = dumpOut.match(/Mnemonic #1:\s*([\s\S]*?)\n/);
      const seedPhrase = seedMatch ? seedMatch[1].replace(/\s+/g, ' ').trim() : null;
      const hashedSeed = seedPhrase ? await bcrypt.hash(seedPhrase, 10) : null;
      
      console.log('🧠 Extracted seed phrase successfully');

      if (!seedPhrase) {
        return res.status(500).json({ message: 'Seed phrase not found in wallet output' });
      }

      // Start the wallet daemon
      const daemonResult = await startWalletDaemon(keysFile, walletPassword, port);
      if (!daemonResult.success) {
        console.error('Failed to start wallet daemon:', daemonResult.message);
        // Continue anyway as we can start it later
      }

      // Wait for daemon to be ready before generating address
      setTimeout(() => {
        // Generate a new address
        const addrCmd = `kaspawallet new-address --daemonaddress 127.0.0.1:${port}`;
        exec(addrCmd, (err2, stdout2, stderr2) => {
          if (err2 || !stdout2.includes('kaspa:')) {
            console.error('Failed to generate address:', err2 || stderr2);
            return res.status(500).json({ message: 'Failed to retrieve address' });
          }

          // Extract Kaspa address from output
          const address = stdout2.trim().split('\n').find(line => line.includes('kaspa:')).trim();
          console.log('📬 New address generated:', address);

          // Save wallet details to database
          db.query(
            'INSERT INTO wallets (wallet_file, hashed_password, hashed_seed, main_address) VALUES (?, ?, ?, ?)',
            [keysFile, hashedPassword, hashedSeed, address],
            (err3, walletResult) => {
              if (err3) {
                console.error('DB insert failed:', err3);
                return res.status(500).json({ message: 'Database insert error' });
              }

              const walletId = walletResult.insertId;
              
              // Associate wallet with the user
              db.query(
                'UPDATE users SET wallet_id = ?, daemon_port = ? WHERE id = ?',
                [walletId, port, user.id],
                (err4) => {
                  if (err4) {
                    console.error('DB update failed:', err4);
                    return res.status(500).json({ message: 'Database update error' });
                  }

                  // Return success with seed phrase and address
                  return res.json({
                    message: 'Wallet created and daemon started',
                    address,
                    seedPhrase // Send the extracted seed back to frontend
                  });
                }
              );
            }
          );
        });
      }, 2000); // Wait 2 seconds for daemon to be ready
    });
  });
});

// Check if user has a wallet
router.get('/wallet/status', (req, res) => {
  const db = req.db;
  const user = req.session.user;
  
  if (!user) {
    console.log('Wallet status check: No user in session');
    return res.status(401).json({ message: 'Not logged in' });
  }

  db.query('SELECT wallet_id, daemon_port FROM users WHERE id = ?', [user.id], (err, rows) => {
    if (err) {
      console.error('Database error in wallet status check:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    const attached = rows.length > 0 && rows[0].wallet_id !== null;
    const port = rows.length > 0 ? rows[0].daemon_port : null;
    
    console.log(`Wallet status for user ${user.username}: ${attached ? 'Attached' : 'Not attached'}`);
    
    res.json({ attached, port });
  });
});

// Get user's wallet address
router.get('/wallet/address', (req, res) => {
  const db = req.db;
  const user = req.session.user;
  
  if (!user) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  db.query(
    'SELECT w.main_address FROM users u JOIN wallets w ON u.wallet_id = w.wallet_id WHERE u.id = ?',
    [user.id],
    (err, rows) => {
      if (err) {
        console.error('Database error fetching address:', err);
        return res.status(500).json({ message: 'Database error fetching address' });
      }
      
      if (!rows.length || !rows[0].main_address) {
        return res.status(404).json({ message: 'Address not found' });
      }

      res.json({ address: rows[0].main_address });
    }
  );
});

// Get wallet balance
// Replace this section in your routes/wallet.js file

// Get wallet balance
router.get('/wallet/balance', (req, res) => {
  const db = req.db;
  const user = req.session.user;
  if (!user) return res.status(401).json({ message: 'Not logged in' });

  db.query('SELECT daemon_port FROM users WHERE id = ?', [user.id], (err, rows) => {
    if (err || !rows.length || !rows[0].daemon_port) {
      return res.status(500).json({ message: 'No port associated with user' });
    }

    const port = rows[0].daemon_port;
    
    // Don't try to check if the daemon is running, just try to get the balance
    // If it fails, we'll handle the error appropriately
    checkBalance(port);
    
    function checkBalance(port) {
      console.log(`Checking balance for daemon on port ${port}...`);
      
      const cmd = `kaspawallet balance -v --daemonaddress 127.0.0.1:${port}`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          // If we get "connection refused", that means the daemon isn't running
          if (stderr && stderr.includes('connection refused')) {
            console.log(`No daemon running on port ${port}, cannot check balance`);
            return res.status(500).json({ 
              message: 'Wallet daemon not running',
              formattedBalance: '0 KAS',
              parsedBalance: 0 
            });
          }
          
          // If we got a "not synced yet" error, wait and try again
          if (stderr && stderr.includes('not synced yet')) {
            console.log('Wallet daemon not synced yet, waiting to retry...');
            setTimeout(() => checkBalance(port), 3000); // Retry after 3 seconds
            return;
          }
          
          console.error('Balance check error:', error, stderr);
          return res.status(500).json({ 
            message: 'Error fetching balance', 
            error: stderr,
            formattedBalance: '0 KAS',
            parsedBalance: 0
          });
        }

        console.log('💰 Balance output:\n', stdout);
        
        // Parse the balance output for easier frontend processing
        let parsedBalance = null;
        
        // Try to match "Total balance, KAS X.XXXXX" format
        const totalMatch = stdout.match(/Total balance, KAS\s+(\d+\.\d+)/);
        if (totalMatch && totalMatch[1]) {
          parsedBalance = parseFloat(totalMatch[1]);
        } else {
          // Try to match address with balance format
          const addressMatch = stdout.match(/kaspa:.+?\s+(\d+\.\d+)\s/);
          if (addressMatch && addressMatch[1]) {
            parsedBalance = parseFloat(addressMatch[1]);
          }
        }
        
        res.json({ 
          balance: stdout,
          parsedBalance: parsedBalance !== null ? parsedBalance : 0,
          formattedBalance: parsedBalance !== null ? `${parsedBalance.toFixed(8)} KAS` : '0 KAS'
        });
      });
    }
  });
});

// Send KAS to an address
router.post('/wallet/send', async (req, res) => {
  const db = req.db;
  const user = req.session.user;
  
  if (!user) {
    return res.status(401).json({ message: 'Not logged in' });
  }
  
  const { toAddress, amount, password } = req.body;
  
  // Validate input
  if (!toAddress || !toAddress.startsWith('kaspa:')) {
    return res.status(400).json({ message: 'Invalid Kaspa address' });
  }
  
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }
  
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }
  
  try {
    // Get user's daemon port and wallet file
    const [userData] = await db.promise().query(
      'SELECT u.daemon_port, w.wallet_file, w.hashed_password FROM users u JOIN wallets w ON u.wallet_id = w.wallet_id WHERE u.id = ?',
      [user.id]
    );
    
    if (!userData || !userData.length) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    
    const { daemon_port, wallet_file, hashed_password } = userData[0];
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, hashed_password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    
    // Check if daemon is running
    const isPortInUseResult = await isPortInUse(daemon_port);
    if (!isPortInUseResult) {
      // Start daemon if not running
      console.log(`Daemon not running, starting it on port ${daemon_port}...`);
      await startWalletDaemon(wallet_file, password, daemon_port);
      
      // Wait for daemon to start
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Prepare the send command
    const sendCmd = `kaspawallet send -f "${wallet_file}" -p ${password} -d 127.0.0.1:${daemon_port} -t ${toAddress} -v ${amount} -x 100000000`;
    
    console.log(`Executing send command: ${sendCmd.replace(password, '*****')}`);
    
    // Execute the send command
    exec(sendCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Send transaction error:', stderr || error.message);
        
        // Handle known error conditions
        if (stderr.includes('insufficient funds')) {
          return res.status(400).json({ message: 'Insufficient funds for this transaction' });
        }
        
        if (stderr.includes('not synced yet')) {
          return res.status(503).json({ message: 'Wallet is not fully synced yet, please try again in a moment' });
        }
        
        return res.status(500).json({ message: 'Failed to send transaction', error: stderr || error.message });
      }
      
      console.log('Send transaction output:', stdout);
      
      // Extract transaction ID from output if possible
      let txId = null;
      const txIdMatch = stdout.match(/Transaction ID: ([a-f0-9]+)/);
      if (txIdMatch && txIdMatch[1]) {
        txId = txIdMatch[1];
      }
      
      res.json({ 
        message: 'Transaction sent successfully',
        txId,
        amount,
        recipient: toAddress
      });
    });
  } catch (error) {
    console.error('Error in send transaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
