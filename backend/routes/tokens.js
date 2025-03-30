const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const WebSocket = require('ws');
const axios = require('axios');
const { generateTokenLogo } = require('../utils/tokenLogoGenerator');
const { fetchTokenLogo } = require('../utils/logoFetcher');

// Kaspa WebSocket URL and CoinGecko API URL
const wsUrl = 'ws://127.0.0.1:16110'; // Change to your local node address
const coingeckoUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd';

// Function to fetch wallet balance using Kaspa WebSocket
async function getBalance(address) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
            const utxoRequest = {
                id: 1,
                method: 'getUtxosByAddresses',
                params: { addresses: [address] },
            };
            ws.send(JSON.stringify(utxoRequest));
        });

        ws.on('message', (data) => {
            try {
                const response = JSON.parse(data);
                if (response.error) {
                    reject(new Error(response.error.message));
                    ws.close();
                    return;
                }

                if (response.id === 1) {
                    const entries = response.params?.entries || [];
                    const balance = entries.reduce((sum, utxo) => {
                        const utxoEntry = utxo.utxoEntry || {};
                        return sum + (utxoEntry.amount || 0);
                    }, 0);
                    resolve(balance);
                    ws.close();
                }
            } catch (error) {
                reject(error);
                ws.close();
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        });

        // Set a timeout to avoid hanging connections
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
                reject(new Error('WebSocket request timed out'));
            }
        }, 10000);
    });
}

// Function to fetch KRC20 balances from Kasplex API
async function getKRC20Balances(address) {
    try {
        console.log(`Fetching KRC20 balances for address: ${address}`);
        const apiUrl = `https://api.kasplex.org/v1/krc20/address/${address}/tokenlist`;
        const response = await axios.get(apiUrl);

        if (response.status !== 200 || !response.data.result) {
            console.error('Invalid response from Kasplex API:', response.data);
            return [];
        }

        console.log(`Found ${response.data.result.length} tokens for address ${address}`);
        return response.data.result.map((token) => {
            const balance = parseFloat(token.balance) / Math.pow(10, token.dec);
            return {
                symbol: token.tick,
                name: token.tick, // API doesn't provide full name
                balance,
                decimals: parseInt(token.dec, 10),
                locked: parseFloat(token.locked) / Math.pow(10, token.dec),
                address: token.address || ''
            };
        });
    } catch (error) {
        console.error('Error fetching KRC20 balances:', error);
        // Fall back to a less direct API or return empty array
        return [];
    }
}

// Then update the updateTokenInDatabase function
async function updateTokenInDatabase(db, userId, token) {
    try {
        // Look up token in database
        const [existingTokens] = await db.promise().query(
            'SELECT * FROM krc20_tokens WHERE token_symbol = ?', 
            [token.symbol]
        );
        
        let tokenId;
        
        if (existingTokens && existingTokens.length > 0) {
            // Token exists, update its balance
            tokenId = existingTokens[0].token_id;
            
            // Update user balance
            await db.promise().query(
                'INSERT INTO user_token_balances (user_id, token_id, balance) VALUES (?, ?, ?) ' +
                'ON DUPLICATE KEY UPDATE balance = ?',
                [userId, tokenId, token.balance, token.balance]
            );
            
            // Check if we need to fetch a logo
            if (!existingTokens[0].icon_url) {
                const logoUrl = await fetchTokenLogo(token.symbol);
                if (logoUrl) {
                    await db.promise().query(
                        'UPDATE krc20_tokens SET icon_url = ? WHERE token_id = ?',
                        [logoUrl, tokenId]
                    );
                }
            }
        } else {
            // Token doesn't exist, create it
            
            // Try to fetch logo
            const logoUrl = await fetchTokenLogo(token.symbol);
            
            // Insert new token with logo if available
            const [newToken] = await db.promise().query(
                'INSERT INTO krc20_tokens (token_name, token_symbol, token_address, decimals, icon_url) VALUES (?, ?, ?, ?, ?)',
                [token.name || token.symbol, token.symbol, token.address || '', token.decimals || 8, logoUrl]
            );
            
            tokenId = newToken.insertId;
            
            // Insert balance
            await db.promise().query(
                'INSERT INTO user_token_balances (user_id, token_id, balance) VALUES (?, ?, ?)',
                [userId, tokenId, token.balance]
            );
        }
        
        return tokenId;
    } catch (error) {
        console.error('Error updating token in database:', error);
        return null;
    }
}

// Also update the refresh logo route
router.get('/token/refresh-logo/:symbol', async (req, res) => {
    const db = req.db;
    const tokenSymbol = req.params.symbol;
    
    if (!tokenSymbol) {
        return res.status(400).json({ message: 'Token symbol is required' });
    }
    
    try {
        // Get token from database
        const [tokens] = await db.promise().query(
            'SELECT * FROM krc20_tokens WHERE token_symbol = ?',
            [tokenSymbol]
        );
        
        if (!tokens || tokens.length === 0) {
            return res.status(404).json({ message: 'Token not found' });
        }
        
        const token = tokens[0];
        
        // Fetch logo
        const logoUrl = await fetchTokenLogo(token.token_symbol);
        
        if (!logoUrl) {
            return res.status(404).json({ message: 'Logo not found for this token' });
        }
        
        // Update database
        await db.promise().query(
            'UPDATE krc20_tokens SET icon_url = ? WHERE token_id = ?',
            [logoUrl, token.token_id]
        );
        
        res.json({
            message: 'Logo updated successfully',
            token_symbol: token.token_symbol,
            logo_url: logoUrl
        });
    } catch (error) {
        console.error('Error refreshing token logo:', error);
        res.status(500).json({ message: 'Error refreshing logo', error: error.message });
    }
});


// Get all KRC-20 tokens and user balances
router.get('/tokens', async (req, res) => {
    const db = req.db;
    const user = req.session.user;
    
    if (!user) {
        return res.status(401).json({ message: 'Not logged in' });
    }
    
    try {
        // Get user's wallet address
        const [addressRows] = await db.promise().query(
            'SELECT w.main_address FROM users u JOIN wallets w ON u.wallet_id = w.wallet_id WHERE u.id = ?',
            [user.id]
        );
        
        if (!addressRows || addressRows.length === 0) {
            return res.status(404).json({ message: 'Wallet address not found' });
        }
        
        const walletAddress = addressRows[0].main_address;
        
        try {
            // Get tokens from blockchain
            const blockchainTokens = await getKRC20Balances(walletAddress);
            
            // Process each token and update database
            const processedTokens = [];
            
            for (const token of blockchainTokens) {
                const tokenId = await updateTokenInDatabase(db, user.id, token);
                
                // Get complete token data from database including logo
                if (tokenId) {
                    const [tokenData] = await db.promise().query(
                        'SELECT * FROM krc20_tokens WHERE token_id = ?',
                        [tokenId]
                    );
                    
                    if (tokenData && tokenData.length > 0) {
                        processedTokens.push({
                            token_id: tokenData[0].token_id,
                            token_name: tokenData[0].token_name,
                            token_symbol: tokenData[0].token_symbol,
                            token_address: tokenData[0].token_address,
                            decimals: tokenData[0].decimals,
                            icon_url: tokenData[0].icon_url,
                            balance: token.balance
                        });
                    } else {
                        // Fallback if database query fails
                        processedTokens.push({
                            token_symbol: token.symbol,
                            token_name: token.name || token.symbol,
                            token_address: token.address || '',
                            decimals: token.decimals || 8,
                            balance: token.balance,
                            icon_url: null
                        });
                    }
                }
            }
            
            // Return tokens with logos
            res.json({ tokens: processedTokens });
        } catch (error) {
            console.error('Error fetching blockchain token data:', error);
            res.status(500).json({ 
                message: 'Error fetching token data',
                error: error.message,
                tokens: [] // Empty array instead of mock data
            });
        }
    } catch (error) {
        console.error('Error in token retrieval:', error);
        res.status(500).json({ message: 'Server error', tokens: [] });
    }
});

// Send tokens to another user (implemented via database for now)
router.post('/tokens/send', async (req, res) => {
    const db = req.db;
    const user = req.session.user;
    
    if (!user) {
        return res.status(401).json({ message: 'Not logged in' });
    }
    
    const { tokenId, recipient, amount } = req.body;
    
    if (!tokenId || !recipient || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Begin transaction
    db.beginTransaction(async (err) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        
        try {
            // Get recipient user ID
            db.query('SELECT id FROM users WHERE username = ?', [recipient], (err, users) => {
                if (err || users.length === 0) {
                    db.rollback();
                    return res.status(404).json({ message: 'Recipient not found' });
                }
                
                const recipientId = users[0].id;
                
                // Check sender balance
                db.query('SELECT balance FROM user_token_balances WHERE user_id = ? AND token_id = ?', 
                    [user.id, tokenId], 
                    (err, balances) => {
                        if (err) {
                            db.rollback();
                            return res.status(500).json({ message: 'Error checking balance' });
                        }
                        
                        const currentBalance = balances.length > 0 ? parseFloat(balances[0].balance) : 0;
                        
                        if (currentBalance < amount) {
                            db.rollback();
                            return res.status(400).json({ message: 'Insufficient balance' });
                        }
                        
                        // Generate a transaction hash
                        const txHash = `krc20_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
                        
                        // Record transaction in database
                        db.query('INSERT INTO token_transactions (token_id, from_user_id, to_user_id, amount, transaction_hash, status) VALUES (?, ?, ?, ?, ?, ?)',
                            [tokenId, user.id, recipientId, amount, txHash, 'confirmed'],
                            (err) => {
                                if (err) {
                                    db.rollback();
                                    return res.status(500).json({ message: 'Error recording transaction' });
                                }
                                
                                // Update sender balance
                                db.query(
                                    balances.length > 0 
                                        ? 'UPDATE user_token_balances SET balance = balance - ? WHERE user_id = ? AND token_id = ?'
                                        : 'INSERT INTO user_token_balances (balance, user_id, token_id) VALUES (?, ?, ?)',
                                    balances.length > 0 
                                        ? [amount, user.id, tokenId]
                                        : [-amount, user.id, tokenId],
                                    (err) => {
                                        if (err) {
                                            db.rollback();
                                            return res.status(500).json({ message: 'Error updating sender balance' });
                                        }
                                        
                                        // Check recipient balance
                                        db.query('SELECT balance FROM user_token_balances WHERE user_id = ? AND token_id = ?',
                                            [recipientId, tokenId],
                                            (err, recipientBalances) => {
                                                if (err) {
                                                    db.rollback();
                                                    return res.status(500).json({ message: 'Error checking recipient balance' });
                                                }
                                                
                                                // Update recipient balance
                                                db.query(
                                                    recipientBalances.length > 0
                                                        ? 'UPDATE user_token_balances SET balance = balance + ? WHERE user_id = ? AND token_id = ?'
                                                        : 'INSERT INTO user_token_balances (balance, user_id, token_id) VALUES (?, ?, ?)',
                                                    recipientBalances.length > 0
                                                        ? [amount, recipientId, tokenId]
                                                        : [amount, recipientId, tokenId],
                                                    (err) => {
                                                        if (err) {
                                                            db.rollback();
                                                            return res.status(500).json({ message: 'Error updating recipient balance' });
                                                        }
                                                        
                                                        // Commit transaction
                                                        db.commit((err) => {
                                                            if (err) {
                                                                db.rollback();
                                                                return res.status(500).json({ message: 'Error committing transaction' });
                                                            }
                                                            
                                                            res.json({ 
                                                                message: 'Tokens sent successfully',
                                                                txHash
                                                            });
                                                        });
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            });
        } catch (error) {
            db.rollback();
            console.error('Error in token transfer:', error);
            res.status(500).json({ message: 'Server error' });
        }
    });
});

// Add a utility route to manually fetch a logo for a token
router.get('/token/refresh-logo/:symbol', async (req, res) => {
    const db = req.db;
    const tokenSymbol = req.params.symbol;
    
    if (!tokenSymbol) {
        return res.status(400).json({ message: 'Token symbol is required' });
    }
    
    try {
        // Get token from database
        const [tokens] = await db.promise().query(
            'SELECT * FROM krc20_tokens WHERE token_symbol = ?',
            [tokenSymbol]
        );
        
        if (!tokens || tokens.length === 0) {
            return res.status(404).json({ message: 'Token not found' });
        }
        
        const token = tokens[0];
        
        // Fetch logo
        const logoPath = await fetchTokenLogo(token.token_symbol, token.token_address);
        
        if (!logoPath) {
            return res.status(404).json({ message: 'Logo not found for this token' });
        }
        
        // Update database
        await db.promise().query(
            'UPDATE krc20_tokens SET icon_url = ? WHERE token_id = ?',
            [logoPath, token.token_id]
        );
        
        res.json({
            message: 'Logo updated successfully',
            token_symbol: token.token_symbol,
            logo_path: logoPath
        });
    } catch (error) {
        console.error('Error refreshing token logo:', error);
        res.status(500).json({ message: 'Error refreshing logo', error: error.message });
    }
});

// Get Kaspa price from API
router.get('/price/kaspa', async (req, res) => {
    try {
        // Using CoinGecko API for price data
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd');
        const data = await response.json();
        
        if (data && data.kaspa && data.kaspa.usd) {
            res.json({ 
                price: data.kaspa.usd,
                currency: 'USD'
            });
        } else {
            // Fallback price if API fails
            res.json({ 
                price: 0.04, 
                currency: 'USD',
                source: 'fallback'
            });
        }
    } catch (error) {
        console.error('Error fetching Kaspa price:', error);
        // Return fallback price if there's an error
        res.json({ 
            price: 0.04, 
            currency: 'USD',
            source: 'fallback'
        });
    }
});



// Route to fix all token icons in the database
router.get('/fix-token-icons', async (req, res) => {
  const db = req.db;
  
  try {
    // Get all tokens that have relative icon URLs
    const [tokens] = await db.promise().query(
      "SELECT * FROM krc20_tokens WHERE icon_url LIKE '/public/%' OR icon_url IS NULL"
    );
    
    console.log(`Found ${tokens.length} tokens to update icons for`);
    
    // Update count
    let updatedCount = 0;
    
    // Process each token
    for (const token of tokens) {
      try {
        // Fetch logo URL
        const logoUrl = await fetchTokenLogo(token.token_symbol);
        
        if (logoUrl) {
          // Update token with the full URL
          await db.promise().query(
            'UPDATE krc20_tokens SET icon_url = ? WHERE token_id = ?',
            [logoUrl, token.token_id]
          );
          
          updatedCount++;
          console.log(`Updated icon for ${token.token_symbol} to ${logoUrl}`);
        }
      } catch (error) {
        console.error(`Error updating icon for ${token.token_symbol}:`, error);
      }
    }
    
    res.json({
      message: `Updated ${updatedCount} of ${tokens.length} token icons`,
      updated: updatedCount,
      total: tokens.length
    });
  } catch (error) {
    console.error('Error fixing token icons:', error);
    res.status(500).json({ message: 'Error fixing token icons', error: error.message });
  }
});

module.exports = router;
