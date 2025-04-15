const { getUtxosViaWS } = require('./kaspaWsClient');
const { Buffer } = require('buffer');

// Helper to encode PushData (simple 1-byte length prefix)
function encodePushData(buffer) {
  const len = buffer.length;

  if (len <= 0x4b) {
    // Simple push: 1-byte length prefix
    return Buffer.concat([Buffer.from([len]), buffer]);
  } else if (len <= 0xff) {
    // PUSHDATA1: 0x4c <length> <data>
    return Buffer.concat([Buffer.from([0x4c, len]), buffer]);
  } else {
    throw new Error('Payload too large for PUSHDATA1 (max 255 bytes)');
  }
}


// Core KRC20 builder
async function buildKRC20Transfer({ fromAddress, toAddress, amount, ticker }) {
  const entries = await getUtxosViaWS(fromAddress);

  if (!entries || entries.length === 0) {
    throw new Error('No UTXOs available for this address.');
  }

  // Pick the first usable UTXO
  const selected = entries[0];

  const inscription = {
    p: "krc-20",
    op: "transfer",
    tick: ticker,
    amt: amount.toString(),
    to: toAddress
  };

  const inscriptionStr = JSON.stringify(inscription);
  const pushDataHex = encodePushData(Buffer.from(inscriptionStr, 'utf8')).toString('hex');

  const rawTx = {
    version: 0,
    inputs: [
      {
        previousOutpoint: selected.outpoint,
        signatureScript: pushDataHex,
        sequence: 0xFFFFFFFF
      }
    ],
    outputs: [
      {
        value: 1000, // minimum dust output
        scriptPublicKey: {
          version: 0,
          script: selected.utxoEntry.scriptPublicKey
        }
      }
    ],
    lockTime: 0,
    subnetworkId: "00000000000000000000000000000000",
    gas: 0,
    payload: ""
  };

  return rawTx;
}

module.exports = {
  buildKRC20Transfer
};
