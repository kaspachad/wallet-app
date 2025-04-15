// test-transfer.js

const { ScriptBuilder, Opcodes, addressFromScriptPublicKey, createTransactions, kaspaToSompi, RpcClient, Encoding } = require('kaspa');
const { w3cwebsocket } = require('websocket');
globalThis.WebSocket = w3cwebsocket;

// === Input Values ===
const fromAddress = 'kaspa:qp4dgqnu0y4zrqfam76v5qnxrgh5sxveud89wucx2a6h08amw6psx2u6qvs87';
const toAddress = 'kaspa:qqev4q2sya03t59de53rmlxtgvpfy84p0ftukg6yrdnwz29vcph2x9sqah2h5';
const ticker = 'ENGINE';
const amount = '5'; // human-readable
const networkId = 'mainnet';

// === Insert your private key here ===
const { PrivateKey } = require('kaspa'); // from the kaspa SDK
const privateKey = PrivateKey.fromWif('PASTE_YOUR_PRIVATE_KEY_HERE');

const rpc = new RpcClient({
  url: 'ws://127.0.0.1:17110',
  encoding: Encoding.Borsh,
  network: networkId
});

async function runTest() {
  await rpc.connect();

  const tokenAmount = (parseFloat(amount) * 1e8).toString(); // convert to 8 decimals
  const krc20Payload = {
    p: 'KRC-20',
    op: 'transfer',
    tick: ticker,
    amt: tokenAmount,
    to: toAddress
  };

  const publicKey = privateKey.toPublicKey();
  const script = new ScriptBuilder()
    .addData(publicKey.toXOnlyPublicKey().toString())
    .addOp(Opcodes.OpCheckSig)
    .addOp(Opcodes.OpFalse)
    .addOp(Opcodes.OpIf)
    .addData(Buffer.from('kasplex'))
    .addI64(BigInt(0))
    .addData(Buffer.from(JSON.stringify(krc20Payload)))
    .addOp(Opcodes.OpEndIf);

  const scriptPubKey = script.createPayToScriptHashScript();
  const p2shAddress = addressFromScriptPublicKey(scriptPubKey, networkId).toString();

  console.log('🔐 Sending KRC20 Transfer');
  console.log('P2SH Address:', p2shAddress);
  console.log('Payload:', JSON.stringify(krc20Payload, null, 2));

  // 1. Fetch UTXOs for sender
  const { entries: utxos } = await rpc.getUtxosByAddresses({ addresses: [fromAddress] });

  // 2. Create the commit transaction
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
  const commitTxId = await commitTx.submit(rpc);
  console.log('✅ Commit TX submitted:', commitTxId);

  // 3. Wait for the P2SH UTXO to show up
  console.log('⏳ Waiting for P2SH UTXO...');
  let revealInput = null;
  for (let i = 0; i < 10; i++) {
    const { entries: revealUtxos } = await rpc.getUtxosByAddresses({ addresses: [p2shAddress] });
    if (revealUtxos.length > 0) {
      revealInput = revealUtxos[0];
      break;
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  if (!revealInput) {
    console.error('❌ Could not find P2SH UTXO. Reveal aborted.');
    process.exit(1);
  }

  // 4. Fetch fresh UTXOs from sender again
  const { entries: freshUtxos } = await rpc.getUtxosByAddresses({ addresses: [fromAddress] });

  // 5. Create the reveal transaction
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
  const revealTxId = await revealTx.submit(rpc);

  console.log('✅ Reveal TX submitted:', revealTxId);
}

runTest().catch(err => {
  console.error('❌ Error during test:', err.message || err);
});

