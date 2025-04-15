const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// This function signs a raw transaction hex using kaspawallet
function signTransaction({ txHex, keysFile, password }) {
  return new Promise((resolve, reject) => {
    if (!txHex || !keysFile || !password) {
      return reject(new Error('Missing required inputs for signing'));
    }

    // Spawn kaspawallet sign process
    const sign = spawn('kaspawallet', [
      'sign',
      '-f', keysFile,
      '-p', password,
      '-t', txHex
    ]);

    let output = '';
    let error = '';

    sign.stdout.on('data', (data) => {
      output += data.toString();
    });

    sign.stderr.on('data', (data) => {
      error += data.toString();
    });

    sign.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Sign process failed: ${error}`));
      }

      const signedTxHex = output.trim();
      console.log(`[signer] Signed TX: ${signedTxHex}`);
      resolve(signedTxHex);
    });
  });
}

module.exports = { signTransaction };

