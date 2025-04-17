const bip39 = require('bip39');
const { HDKey } = require('@scure/bip32');

// Replace with your seed phrase (12 or 24 words)
const mnemonic = ""; 
const password = ""; // Optional passphrase (if used)

// Kaspa derivation path: m/44'/111111'/0'/0/0
const derivationPath = "m/44'/111111'/0'/0/0";

async function deriveKaspaPrivateKey() {
  try {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid seed phrase. Please check your input.");
    }

    // Generate seed from mnemonic and optional password
    const seed = await bip39.mnemonicToSeed(mnemonic, password);

    // Create HD wallet node from seed using @scure/bip32
    const rootNode = HDKey.fromMasterSeed(seed);

    // Derive Kaspa private key using the specified path
    const childNode = rootNode.derive(derivationPath);

    // Convert private key to hexadecimal format
    const privateKeyHex = Buffer.from(childNode.privateKey).toString('hex');

    console.log("Kaspa Private Key (Hex):", privateKeyHex);
  } catch (error) {
    console.error("Error deriving private key:", error.message);
  }
}

deriveKaspaPrivateKey();

