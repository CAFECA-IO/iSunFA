import fs from "fs";
import path from "path";
import crypto from "crypto";
import { keccak256, toBytes } from "viem";
import { Wallet } from "ethers";

const envAdminPath = path.join(process.cwd(), ".env.admin");
const envSeedPath = path.join(process.cwd(), ".env.seed");

/**
 * Info: (20260411 - Luphia)
 * Validates if the given file content is a valid Web3 Secret Storage (Keystore V3) JSON.
 */
function isValidKeystoreV3(content: string): boolean {
  try {
    const json = JSON.parse(content);
    const cryptoObj = json.crypto || json.Crypto;
    return !!(cryptoObj && cryptoObj.mac && json.version === 3);
  } catch {
    return false;
  }
}

async function main() {
  console.log("Checking .env.admin...");

  let shouldRegenerate = true;
  const isForce = process.argv.includes("force");

  if (fs.existsSync(envAdminPath)) {
    const content = fs.readFileSync(envAdminPath, "utf-8");
    if (isValidKeystoreV3(content)) {
      console.log(".env.admin contains a valid encrypted BIP44 wallet Keystore.");
      shouldRegenerate = false;
    } else {
      console.log(".env.admin format is invalid. Regenerating...");
    }
  } else {
    console.log(".env.admin does not exist. Creating a new one...");
  }

  if (isForce) {
    console.log("-- force parameter detected. Forcing regeneration...");
    shouldRegenerate = true;
  }

  if (!shouldRegenerate) {
    console.log("Wallet already exists and is valid.");
    const content = fs.readFileSync(envAdminPath, "utf-8");
    const json = JSON.parse(content);
    console.log(`Current Address: 0x${json.address}`);
    console.log("Run `npm run initial_wallet -- force` to forcibly overwrite.");
    return;
  }

  // Info: (20260411 - Luphia) 1. Generate a random base64 text for .env.seed
  const seedValue = crypto.randomBytes(32).toString("base64");
  fs.writeFileSync(envSeedPath, seedValue, "utf-8");
  console.log("Generated random base64 seed and saved to .env.seed.");

  // Info: (20260411 - Luphia) 2. keccak256(.env.seed) as password
  const password = keccak256(toBytes(seedValue));
  console.log(`Password derived from seed: ${password.substring(0, 10)}...`);

  // Info: (20260411 - Luphia) 3. Create BIP44 Wallet (with mnemonic)
  console.log("Generating BIP44 Wallet and encrypting... (This may take a few seconds)");

  let wallet;
  try {
    // Info: (20260411 - Luphia) Trying iSunCoin (if installed contextually)
    wallet = Wallet.createRandom();
    const encryptedJson = await wallet.encrypt(password);

    // Info: (20260411 - Luphia) 4. Save to .env.admin
    fs.writeFileSync(envAdminPath, encryptedJson, "utf-8");
    console.log(`Successfully created and encrypted BIP44 wallet to .env.admin`);
    console.log(`Address: ${wallet.address}`);
  } catch (e) {
    console.error("Error creating/encrypting wallet. Note: This script requires 'ethers' to encrypt to Keystore V3.");
    console.error(e);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
