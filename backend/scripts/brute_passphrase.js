const bip39 = require('bip39');
const { mnemonicToSeedSync } = require('bip39');
const { HDKey } = require('@scure/bip32');
const bs58check = require('bs58check');
const crypto = require('crypto');

// === 🔐 Replace with your actual 24-word phrase ===
const mnemonic = "lift net side glue viable record will lady soon outdoor accident lift sentence drum bone join build keen vendor ranch nephew foil actor blue";

const possiblePassphrases = [
  "",              // no passphrase
  "kasware",       // app default?
  "password",      // common fallback
  "123456",        // dumb guess
  "wallet",        // generic
  "Tapuz123!"      // your last test input
];

// Convert private key buffer to WIF
function toWIF(privKey) {
  const prefix = Buffer.from([0x80]);       // Bitcoin/Kaspa mainnet prefix
  const suffix = Buffer.from([0x01]);       // compressed flag
  const payload = Buffer.concat([prefix, privKey, suffix]);
  return bs58check.encode(payload);
}

// Fake Kaspa-style address (hashed pubkey)
function toKaspaAddress(pubKey) {
  const sha256 = crypto.createHash('sha256').update(pubKey).digest();
  const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest();
  return `kaspa:${ripemd160.toString('hex')}`;
}

function tryPath(seed, path) {
  const root = HDKey.fromMasterSeed(seed);
  const key = root.derive(path);
  if (!key.privateKey) return null;
  return {
    wif: toWIF(key.privateKey),
    pubHex: key.publicKey.toString('hex'),
    pubBuf: key.publicKey
  };
}

function run() {
  if (!bip39.validateMnemonic(mnemonic)) {
    console.error("❌ Invalid mnemonic. Double-check the words.");
    return;
  }

  const path = "m/44'/111111'/0'/0/0"; // Kaspa's standard path

  for (const pass of possiblePassphrases) {
    try {
      console.log(`🔑 Trying passphrase: "${pass}"`);
      const seed = mnemonicToSeedSync(mnemonic, pass);
      const result = tryPath(seed, path);

      if (result) {
        console.log(`✅ MATCH using passphrase "${pass}"`);
        console.log("🔐 WIF Private Key:", result.wif);
        console.log("🏠 Derived Address (simulated):", toKaspaAddress(result.pubBuf));
        return;
      }
    } catch (err) {
      console.warn(`⚠️ Error with passphrase "${pass}":`, err.message);
    }
  }

  console.error("🚫 No match found using tested passphrases.");
}

run();

