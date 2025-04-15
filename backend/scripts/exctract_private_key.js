// extract_private_key.js

const kaspa = require("@kaspa/wallet");
const mnemonicWords = "lift net side glue viable record will lady soon outdoor accident lift sentence drum bone join build keen vendor ranch nephew foil actor blue";

try {
    const mnemonic = new kaspa.Mnemonic(mnemonicWords); // 👈 use `new`, not `.fromString()`
    const seed = mnemonic.toSeed();
    const privateKey = kaspa.PrivateKey.fromSeed(seed);

    console.log("✅ Your Kaspa Private Key (hex):", privateKey.toString());

    const keypair = privateKey.toKeypair();
    const address = keypair.toAddress("mainnet").toString();

    console.log("🔑 Derived Address:", address);
    console.log("🧾 Public Key:", keypair.publicKey);
} catch (err) {
    console.error("❌ Failed to derive private key:", err.message);
}

