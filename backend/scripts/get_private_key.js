const bip39 = require('bip39');
const { mnemonicToSeedSync } = require('bip39');
const { HDKey } = require('@scure/bip32');
const { base58check } = require('@scure/base');

// === Replace this ===
const mnemonic = "lift net side glue viable record will lady soon outdoor accident lift sentence drum bone join build keen vendor ranch nephew foil actor blue";

function toWIF(privKey) {
  const prefix = Uint8Array.from([0x80]);
  const suffix = Uint8Array.from([0x01]); // compressed key
  const data = new Uint8Array([...prefix, ...privKey, ...suffix]);
  return base58check.encode('sha256', data);
}

function toHex(buf) {
  return Buffer.from(buf).toString('hex');
}

function tryPath(seed, path) {
  try {
    const root = HDKey.fromMasterSeed(seed);
    const key = root.derive(path);
    if (!key.privateKey) return null;
    return {
      wif: toWIF(key.privateKey),
      pub: toHex(key.publicKey),
    };
  } catch (err) {
    return null;
  }
}

async function run() {
  if (!bip39.validateMnemonic(mnemonic)) {
    console.error("❌ Invalid mnemonic");
    return;
  }

const seed = mnemonicToSeedSync(mnemonic, ""); // or empty string, or your app password
  
const paths = [
    "m/44'/111111'/0'/0/0",
    "m/44'/0'/0'/0/0",
    "m/44'/60'/0'/0/0",
    "m/0'/0/0"
  ];

  for (const path of paths) {
    console.log(`🔎 Trying path: ${path}`);
    const result = tryPath(seed, path);
    if (result) {
      console.log("✅ WIF:", result.wif);
      console.log("📤 Public Key (hex):", result.pub);
      return;
    }
  }

  console.error("❌ No valid key found.");
}

run();

