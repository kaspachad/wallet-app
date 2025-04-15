// routes/miner.js
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');

let miner = null;
let logs = [];

router.post('/start', (req, res) => {
  const { address } = req.body;
  if (miner) return res.status(400).send('Miner already running');

  miner = spawn('kaspaminer', [`--miningaddr=${address}`]);

  miner.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    logs.push(...lines);
    if (logs.length > 1000) logs = logs.slice(-1000); // keep only the last 1000 lines
  });

  miner.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    logs.push(...lines);
    if (logs.length > 1000) logs = logs.slice(-1000);
  });

  miner.on('exit', () => {
    miner = null;
    logs.push('[miner exited]');
  });

  miner.on('error', (err) => {
    logs.push(`[miner error]: ${err.message}`);
  });

  res.send('Miner started');
});

router.post('/stop', (req, res) => {
  if (miner) {
    miner.kill();
    miner = null;
    logs.push('[miner stopped]');
  }
  res.send('Miner stopped');
});

router.get('/log', (req, res) => {
  res.send(logs.join('\n'));
});

module.exports = router;

