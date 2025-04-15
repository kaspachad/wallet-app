const { buildKRC20Transfer } = require('./txBuilder');
const { callKaspaRpc } = require('./kaspaRpc');

// Replace with actual values
const fromAddress = 'kaspa:qz...';
const toAddress = 'kaspa:qq...';
const amount = 1000;
const ticker = 'OZZY';

(async () => {
  try {
    const tx = await buildKRC20Transfer({ fromAddress, toAddress, amount, ticker });
    console.log("Raw TX JSON (needs signing):\n", JSON.stringify(tx, null, 2));

    // TODO: Add signing logic here before broadcasting
    // Example: const signedTx = sign(tx);
    // await callKaspaRpc("submitTransaction", [signedTx]);

  } catch (err) {
    console.error("Error:", err.message);
  }
})();

