const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

const SECRET_KEY = process.env.JWT_SECRET || 'your_fallback_secret';

function getAvailablePort(base = 20000) {
  return base + Math.floor(Math.random() * 1000);
}

async function startWalletDaemon(keysFile, password, port) {
  console.log('Attempting to start kaspawallet daemon for existing wallet...');

  const daemon = spawn('kaspawallet', [
    'start-daemon',
    '-f', keysFile,
    '-p', password,
    '-s', '127.0.0.1:16110',
    '-l', `127.0.0.1:${port}`
  ]);

  daemon.stdout.on('data', (data) => {
    const out = data.toString();
    console.log(`Daemon stdout: ${out}`);
  });

  daemon.stderr.on('data', (data) => {
    console.error(`Daemon stderr: ${data.toString()}`);
  });

  daemon.on('close', (code) => {
    console.log(`Daemon exited with code ${code}`);
  });

  daemon.on('error', (err) => {
    console.error('Failed to start daemon process:', err);
  });
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = req.db;

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) {
      console.error('Login DB error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    console.log(`✅ User '${user.username}' logged in.`);
    console.log('Session user set:', req.session.user);

    // Start wallet daemon if wallet exists
    if (user.wallet_id && user.daemon_port) {
      db.query('SELECT wallet_file FROM wallets WHERE wallet_id = ?', [user.wallet_id], (err, walletResults) => {
        if (err) {
          console.error('Wallet query error:', err);
          return res.status(500).json({ message: 'Failed to find wallet' });
        }
        if (walletResults.length) {
          const keysFile = walletResults[0].wallet_file;
          startWalletDaemon(keysFile, password, user.daemon_port);
        }
      });
    }

    res.json({ message: 'Login successful' });
  });
});

router.get('/admin/test', (req, res) => {
  res.send("Admin route is wired up");
});

router.post('/admin/create-user', (req, res) => {
  console.log("Create user route hit");
  res.json({ message: "OK" });
});

module.exports = router;

