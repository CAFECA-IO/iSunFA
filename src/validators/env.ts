import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { verifyAuthentication } from "@/lib/auth/fido2_server";

// Info: (20260412 - Luphia) Verifies .env SUPER_ADMIN_SIGNATURE FIDO2 integrity
export async function validateEnv(): Promise<boolean> {
  try {
    const examplePath = path.join(process.cwd(), ".env.example");
    const envPath = path.join(process.cwd(), ".env");

    // Info: (20260118 - Luphia) 1. Check if files exist
    if (!fs.existsSync(envPath) || !fs.existsSync(examplePath)) {
      return false;
    }

    // Info: (20260118 - Luphia) 2. Read .env.example to get required keys
    const exampleContent = fs.readFileSync(examplePath, "utf8");
    const exampleConfig = dotenv.parse(exampleContent);
    const requiredKeys = Object.keys(exampleConfig);

    // Info: (20260118 - Luphia) 3. Read .env to get actual keys
    const envContent = fs.readFileSync(envPath, "utf8");
    const envConfig = dotenv.parse(envContent);

    for (const key of requiredKeys) {
      if (!(key in envConfig)) {
        console.warn(`[EnvValidator] Missing key: ${key}`);
        return false;
      }
    }

    // Info: (20260412 - Luphia) 4. Enforce SUPER_ADMIN_SIGNATURE exists
    let signatureStr = envConfig["SUPER_ADMIN_SIGNATURE"];
    if (!signatureStr) {
      console.warn(`[EnvValidator] Missing SUPER_ADMIN_SIGNATURE in .env`);
      return false;
    }

    // Info: (20260412 - Luphia) Replace outer quotes if dotenv missed them
    signatureStr = signatureStr.replace(/^"(.*)"$/, '$1');

    // Info: (20260412 - Luphia) 5. Extract FIDO2 variables
    const pubX = envConfig.SUPER_ADMIN_PUB_X;
    const pubY = envConfig.SUPER_ADMIN_PUB_Y;
    const credId = envConfig.SUPER_ADMIN_CRED_ID;

    if (!pubX || !pubY || !credId) {
      console.warn(`[EnvValidator] Missing SUPER_ADMIN FIDO2 keys in .env`);
      return false;
    }

    /**
     * Info: (20260412 - Luphia) Reconstruct FIDO2 Public Key
     * Derived from lib/auth/fido2_server logic explicitly
     * P-256 SPKI header + uncompressed point
     */
    const spkiPrefix = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE";
    const xHex = BigInt(pubX).toString(16).padStart(64, '0');
    const yHex = BigInt(pubY).toString(16).padStart(64, '0');
    let publicKeyHex = spkiPrefix + Buffer.from(xHex + yHex, 'hex').toString('base64');

    // Info: (20260412 - Luphia) Convert to proper base64 without padding to match passwordless-id/webauthn spec
    publicKeyHex = publicKeyHex.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    const authData = JSON.parse(Buffer.from(signatureStr, "base64").toString("utf-8"));
    const credential = {
      id: credId,
      publicKey: publicKeyHex,
      algorithm: "ES256" as const,
      transports: [],
    };

    // Info: (20260412 - Luphia) 6. Validate the Authentication format
    const clientDataStr = Buffer.from(authData.response.clientDataJSON, "base64url").toString("utf-8");
    const clientData = JSON.parse(clientDataStr);
    const expectedChallenge = clientData.challenge;

    await verifyAuthentication(authData, credential, expectedChallenge);

    return true;
  } catch (error) {
    console.error("[EnvValidator] Error validating env signature:", error);
    return false;
  }
}
