import fs from "fs";
import { createHash } from "crypto";
import path from "path";
import dotenv from "dotenv";
import { verifyAuthentication } from "@/lib/auth/fido2_server";

// Info: (20260412 - Luphia) Verifies .env SUPER_ADMIN_SIGNATURE FIDO2 integrity
export type EnvValidationResult =
  | "COMPLETE"
  | "MISSING_FILES"
  | "MISSING_KEYS"
  | "SIGNATURE_MISMATCH"
  | "UNKNOWN_ERROR";

export interface IEnvValidationResultDetailed {
  status: EnvValidationResult;
  missingKeys: string[];
  envData: Record<string, string>;
}

export async function validateEnvDetailed(): Promise<IEnvValidationResultDetailed> {
  try {
    const examplePath = path.join(process.cwd(), ".env.example");
    const envPath = path.join(process.cwd(), ".env");

    if (!fs.existsSync(envPath) || !fs.existsSync(examplePath)) {
      return { status: "MISSING_FILES", missingKeys: [], envData: {} };
    }

    const exampleContent = fs.readFileSync(examplePath, "utf8");
    const exampleConfig = dotenv.parse(exampleContent);
    const requiredKeys = Object.keys(exampleConfig);

    let envConfig: Record<string, string> = {};
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const cleanContent = envContent
        .split("\n")
        .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"))
        .join("\n");
      envConfig = dotenv.parse(cleanContent);
    }

    const missingKeys: string[] = [];
    for (const key of requiredKeys) {
      if (!(key in envConfig) || envConfig[key] === undefined) {
        missingKeys.push(key);
      }
    }

    let signatureStr = envConfig["SUPER_ADMIN_SIGNATURE"];
    if (!signatureStr) {
      if (!missingKeys.includes("SUPER_ADMIN_SIGNATURE"))
        missingKeys.push("SUPER_ADMIN_SIGNATURE");
    }

    if (missingKeys.length > 0) {
      console.warn(`[EnvValidator] Missing keys: ${missingKeys.join(", ")}`);
      return { status: "MISSING_KEYS", missingKeys, envData: envConfig };
    }

    signatureStr = signatureStr.replace(/^"(.*)"$/, "$1");

    const pubX = envConfig.SUPER_ADMIN_PUB_X;
    const pubY = envConfig.SUPER_ADMIN_PUB_Y;
    const credId = envConfig.SUPER_ADMIN_CRED_ID;

    if (!pubX || !pubY || !credId) {
      console.warn(`[EnvValidator] Missing SUPER_ADMIN FIDO2 keys in .env`);
      return {
        status: "MISSING_KEYS",
        missingKeys: [
          "SUPER_ADMIN_PUB_X",
          "SUPER_ADMIN_PUB_Y",
          "SUPER_ADMIN_CRED_ID",
        ],
        envData: envConfig,
      };
    }

    /**
     * Info: (20260412 - Luphia) Reconstruct FIDO2 Public Key
     * Derived from lib/auth/fido2_server logic explicitly
     * P-256 SPKI header + uncompressed point
     */
    const spkiPrefix = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE";
    const xHex = BigInt(pubX).toString(16).padStart(64, "0");
    const yHex = BigInt(pubY).toString(16).padStart(64, "0");
    let publicKeyHex =
      spkiPrefix + Buffer.from(xHex + yHex, "hex").toString("base64");

    // Info: (20260412 - Luphia) Convert to proper base64 without padding to match passwordless-id/webauthn spec
    publicKeyHex = publicKeyHex
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    let authData;
    let expectedChallenge;
    try {
      authData = JSON.parse(
        Buffer.from(signatureStr, "base64").toString("utf-8"),
      );

      // Info: (20260412 - Luphia) Validate the Authentication format
      const clientDataStr = Buffer.from(
        authData.response.clientDataJSON,
        "base64url",
      ).toString("utf-8");
      const clientData = JSON.parse(clientDataStr);
      expectedChallenge = clientData.challenge;
    } catch (e) {
      console.warn(
        `[EnvValidator] Malformed FIDO2 authentication JSON in SUPER_ADMIN_SIGNATURE`,
        e,
      );
      return {
        status: "SIGNATURE_MISMATCH",
        missingKeys: [],
        envData: envConfig,
      };
    }

    const credential = {
      id: credId,
      publicKey: publicKeyHex,
      algorithm: "ES256" as const,
      transports: [],
    };

    // Info: (20260413 - Luphia) Verify that the .env contents match exactly what was signed using deterministic map hashing
    const envContentForHash = fs.readFileSync(envPath, "utf8");
    const cleanContentForHash = envContentForHash
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"))
      .join("\n");
    const dotenvConfig = dotenv.parse(cleanContentForHash);

    const excludeKeys = ["SUPER_ADMIN_SIGNATURE"];
    for (const k of excludeKeys) {
      delete dotenvConfig[k];
    }

    const sortedKeys = Object.keys(dotenvConfig).sort();
    const stableString = sortedKeys
      .map((k) => `${k}=${dotenvConfig[k]}`)
      .join("\n");

    const hashBuffer = createHash("sha256").update(stableString).digest();
    const computedChallenge = hashBuffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    if (computedChallenge !== expectedChallenge) {
      console.warn(
        `[EnvValidator] .env parameters were modified and do not match the signature. Expected challenge: ${expectedChallenge}, Found: ${computedChallenge}`,
      );
      return {
        status: "SIGNATURE_MISMATCH",
        missingKeys: [],
        envData: envConfig,
      };
    }

    await verifyAuthentication(authData, credential, expectedChallenge);
    return { status: "COMPLETE", missingKeys: [], envData: envConfig };
  } catch (error) {
    console.error("[EnvValidator] Error validating env signature:", error);
    return { status: "UNKNOWN_ERROR", missingKeys: [], envData: {} };
  }
}

export async function validateEnv(): Promise<boolean> {
  const result = await validateEnvDetailed();
  return result.status === "COMPLETE";
}
