// krc20.js

const { ScriptBuilder, Opcodes, Transaction, Encoding, RpcClient, createTransactions, kaspaToSompi, addressFromScriptPublicKey } = require('kaspa'); // or your local WASM path
const { w3cwebsocket } = require('websocket');
globalThis.WebSocket = w3cwebsocket;

/**
 * Build a KRC20 transfer commit + reveal transaction
 */
async function buildKRC20TransferTx({ fromAddress, toAddress, amount, ticker, privateKey, rpcClient, networkId }) {
  // Step 1: Convert amount to sompi-style token units
  const tokenAmount = (parseFloat(amount) * 1e8).toString(); // "12" -> "1200000000"

  // Step 2: Build the token JSON
  const krc20Payload = {
    p: 'KRC-20',
    op: 'transfer',
    tick: ticker,
    amt: tokenAmount,
    to: toAddress
  };

  // Step 3: Build the redeem script
  const publicKey = privateKey.toPublicKey(); // assumes SDK privateKey object
  const script = new ScriptBuilder()
    .addData(publicKey.toXOnlyPublicKey().toString())
    .addOp(Opcodes.OpCheckSig)
    .addOp(Opcodes.OpFalse)
    .addOp(Opcodes.OpIf)
    .addData(Buffer.from('kasplex'))
    .addI64(BigInt(0)) // protocol version
    .addData(Buffer.from(JSON.stringify(krc20Payload)))
    .addOp(Opcodes.OpEndIf);

  const scriptPubKey = script.createPayToScriptHashScript();
  const p2shAddress = addressFromScriptPublicKey(scriptPubKey, networkId).toString();

  // Step 4: Get sender UTXOs
  const { entries: utxos } = await rpcClient.getUtxosByAddresses({ addresses: [fromAddress] });

  // Step 5: Build Commit TX
  const { transactions: commitTxs } = await createTransactions({
    entries: utxos,
    outputs: [{
      address: p2shAddress,
      amount: kaspaToSompi("0.3")
    }],
    changeAddress: fromAddress,
    priorityFee: kaspaToSompi("0.01"),
    networkId
  });

  const commitTx = commitTxs[0];
  commitTx.sign([privateKey]);

  // Step 6: Wait (or skip and fetch after broadcast), then build Reveal TX
  const commitTxId = await commitTx.submit(rpcClient);
  console.log("Commit tx submitted:", commitTxId);

  // Step 7: Poll until the P2SH UTXO appears
  let revealInput = null;
  for (let i = 0; i < 10; i++) {
    const { entries: revealUtxos } = await rpcClient.getUtxosByAddresses({ addresses: [p2shAddress] });
    if (revealUtxos.length > 0) {
      revealInput = revealUtxos[0];
      break;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  if (!revealInput) throw new Error("P2SH UTXO not found after commit");

  // Step 8: Fetch updated UTXOs from sender (again)
  const { entries: freshUtxos } = await rpcClient.getUtxosByAddresses({ addresses: [fromAddress] });

  // Step 9: Create Reveal TX
  const { transactions: revealTxs } = await createTransactions({
    entries: freshUtxos,
    priorityEntries: [revealInput],
    outputs: [],
    changeAddress: fromAddress,
    priorityFee: kaspaToSompi("0.01"),
    networkId
  });

  const revealTx = revealTxs[0];
  revealTx.sign([privateKey], false);

  const revealTxId = await revealTx.submit(rpcClient);
  console.log("Reveal tx submitted:", revealTxId);

  return {
    commitTxHex: commitTx.toHex(),
    revealTxHex: revealTx.toHex(),
    commitTxId,
    revealTxId
  };
}

module.exports = { buildKRC20TransferTx };

