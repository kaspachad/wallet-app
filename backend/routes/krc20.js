const express = require('express');
const router = express.Router();
const { buildKRC20TransferTx } = require('../services/krc20'); // assuming your function is in /services/krc20.js
const { RpcClient, Encoding } = require('kaspa');
const { w3cwebsocket } = require('websocket');
const { getPrivateKeyForAddress } = require('../utils/keyManager'); // custom logic to get keys

globalThis.WebSocket = w3cwebsocket;

// Initialize RpcClient once
const rpc = new RpcClient({
  url: "ws://127.0.0.1:17110",  // update if different
  encoding: Encoding.Borsh,
  network: "mainnet"
});

// Connect immediately
rpc.connect().then(() => console.log("Connected to Kaspa node"));

router.post('/transfer/build', async (req, res) => {
  try {
    const { from, to, amount, ticker } = req.body;

    if (!from || !to || !amount || !ticker) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // TODO: Securely load private key associated with `from`
    const privateKey = getPrivateKeyForAddress(from); // Replace with your key manager
    if (!privateKey) {
      return res.status(403).json({ error: 'Private key not found for sender address.' });
    }

    const result = await buildKRC20TransferTx({
      fromAddress: from,
      toAddress: to,
      amount,
      ticker,
      privateKey,
      rpcClient: rpc,
      networkId: "mainnet"
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;

