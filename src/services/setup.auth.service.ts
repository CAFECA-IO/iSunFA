import { setupRepo } from "@/repositories/setup.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { reconstructKeyFromXY } from "@/lib/auth/crypto_utils";
import { verifyAuthentication } from "@/lib/auth/fido2_server";
import type { AuthenticationJSON } from "@passwordless-id/webauthn";
import {
  ENV_PATH,
  ENV_SETUP_PATH,
  getPriorityEnvConfig,
  getEnvRawContent,
  saveEnvRawContent,
  existsEnv,
  updateOrAppendEnv,
  loadEnvConfig,
} from "@/services/env.service";
import { publicClient } from "@/lib/viem_public";
import { parseAbiItem } from "viem";
import { getDbUrl } from "@/services/setup.db.service";
import {
  getEnvHashChallenge,
  finalizeSetupEnvironment,
  copyEnvToSetupAndStripSignature,
} from "@/services/setup.env.service";

export async function checkSuperAdminExists(): Promise<{
  exists: boolean;
  address?: string;
  needsAuth?: boolean;
  credId?: string;
}> {
  try {
    const dbUrl = await getDbUrl();
    const adminUser = await setupRepo.findSuperAdmin(dbUrl);

    const envConfig = await getPriorityEnvConfig();
    const envCredId = envConfig.SUPER_ADMIN_CRED_ID;
    const envPubX = envConfig.SUPER_ADMIN_PUB_X;
    const envPubY = envConfig.SUPER_ADMIN_PUB_Y;

    if (adminUser) {
      if (!adminUser.credentialId || adminUser.credentialId === "undefined") {
        await setupRepo.deleteUserByAddress(dbUrl, adminUser.address);
        return { exists: false };
      }
      return {
        exists: true,
        address: adminUser.address,
        needsAuth: true,
        credId: envCredId || adminUser.credentialId,
      };
    }

    if (!adminUser && envCredId && envPubX && envPubY) {
      return { exists: true, needsAuth: true, credId: envCredId };
    }

    return { exists: false, address: undefined };
  } catch (err) {
    console.error("checkSuperAdminExists error:", err);
    return { exists: false };
  }
}

export async function authorizeSuperAdmin(authentication?: {
  id: string;
}): Promise<{
  success: boolean;
  address?: string;
  error?: string;
  pendingTask?: boolean;
}> {
  try {
    const dbUrl = await getDbUrl();
    let user;
    try {
      user = await setupRepo.findSuperAdmin(dbUrl);
    } catch (e: unknown) {
      const errStr = e instanceof Error ? e.message : String(e);
      if (errStr.includes("Authentication failed")) {
        return {
          success: false,
          error:
            "Database authentication failed. The database password in your configuration file does not match the underlying running Docker database volume.",
        };
      }
      return { success: false, error: "Database connection failed: " + errStr };
    }

    const envConfig = await getPriorityEnvConfig();
    const targetEnvPath = existsEnv(ENV_SETUP_PATH) ? ENV_SETUP_PATH : ENV_PATH;

    if (user && user.credentialId) {
      if (!authentication || user.credentialId === authentication.id) {
        let setupContent = getEnvRawContent(targetEnvPath);
        setupContent = updateOrAppendEnv(
          setupContent,
          "SUPER_ADMIN_CRED_ID",
          user.credentialId,
        );
        setupContent = updateOrAppendEnv(
          setupContent,
          "SUPER_ADMIN_PUB_X",
          user.pubKeyX!,
        );
        setupContent = updateOrAppendEnv(
          setupContent,
          "SUPER_ADMIN_PUB_Y",
          user.pubKeyY!,
        );
        saveEnvRawContent(targetEnvPath, setupContent);

        return { success: true };
      }
    }

    if (authentication && authentication.id) {
      const factoryAddresses = new Set<`0x${string}`>();
      if (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS)
        factoryAddresses.add(
          envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`,
        );
      if (process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS)
        factoryAddresses.add(
          process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`,
        );

      for (const backupPath of [ENV_PATH]) {
        const backupConfig = await loadEnvConfig(backupPath);
        if (backupConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS) {
          factoryAddresses.add(
            backupConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`,
          );
        }
      }

      for (const factoryAddress of factoryAddresses) {
        try {
          const logs = await publicClient.getLogs({
            address: factoryAddress,
            event: parseAbiItem(
              "event AccountCreated(address indexed scw, uint256 pubKeyX, uint256 pubKeyY, uint256 salt, string credentialId, string name, string imageUrl)",
            ),
            fromBlock: "earliest",
          });

          const matchLog = logs.find(
            (log) => log.args.credentialId === authentication.id,
          );

          if (matchLog && matchLog.args.pubKeyX && matchLog.args.pubKeyY) {
            const pubKeyXStr = matchLog.args.pubKeyX.toString();
            const pubKeyYStr = matchLog.args.pubKeyY.toString();

            let setupContent = getEnvRawContent(targetEnvPath);
            setupContent = updateOrAppendEnv(
              setupContent,
              "SUPER_ADMIN_CRED_ID",
              authentication.id,
            );
            setupContent = updateOrAppendEnv(
              setupContent,
              "SUPER_ADMIN_PUB_X",
              pubKeyXStr,
            );
            setupContent = updateOrAppendEnv(
              setupContent,
              "SUPER_ADMIN_PUB_Y",
              pubKeyYStr,
            );
            saveEnvRawContent(targetEnvPath, setupContent);

            const scw = matchLog.args.scw;
            if (scw) {
              await setupRepo.upsertSuperAdminByAddress(dbUrl, {
                address: scw.toString(),
                credentialId: authentication.id,
                pubKeyX: pubKeyXStr,
                pubKeyY: pubKeyYStr,
                name: matchLog.args.name || "RECOVERED ADMIN",
              });
            }

            return { success: true };
          }
        } catch (e) {
          console.error(
            `Failed to fetch logs for factory ${factoryAddress}`,
            e,
          );
        }
      }
    }

    if (
      (!authentication || !authentication.id) &&
      envConfig.SUPER_ADMIN_CRED_ID &&
      envConfig.SUPER_ADMIN_PUB_X &&
      envConfig.SUPER_ADMIN_PUB_Y
    ) {
      return { success: true };
    }

    const errorMessage = authentication?.id
      ? "Passkey not recognized. This credential does not exist in the server's database, backups, or on-chain records. It may have been previously deleted or you selected the wrong one. Please click 'Register New Key' to enroll."
      : "Configuration not found";
    return { success: false, error: errorMessage };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function verifyAndFinalizeConfig(
  authData: AuthenticationJSON,
): Promise<{ success: boolean; error?: string }> {
  try {
    const envPathObj = existsEnv(ENV_SETUP_PATH) ? ENV_SETUP_PATH : ENV_PATH;
    if (!existsEnv(envPathObj))
      return { success: false, error: "Configuration file not found" };

    const envConfig = await loadEnvConfig(envPathObj);
    const pubX = envConfig.SUPER_ADMIN_PUB_X;
    const pubY = envConfig.SUPER_ADMIN_PUB_Y;
    const credId = envConfig.SUPER_ADMIN_CRED_ID;

    if (!pubX || !pubY || !credId)
      return {
        success: false,
        error: "Credentials not found in configuration file.",
      };

    const normalizeId = (id: string) =>
      id.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/=/g, "");
    const safeAuthId = normalizeId(authData.id);
    const safeCredId = normalizeId(credId);

    if (safeAuthId !== safeCredId) {
      console.warn(
        `[verifyAndFinalizeConfig] FIDO Credential ID mismatch! Provided: ${safeAuthId}, Expected: ${safeCredId}`,
      );
      return { success: false, error: "Wrong FIDO credential used." };
    }
    const challengeRes = await getEnvHashChallenge();
    if (!challengeRes.success || !challengeRes.challenge)
      return { success: false, error: "Challenge hashing failed." };

    const credentialPublicKey = reconstructKeyFromXY(pubX, pubY);
    const credential = {
      id: credId,
      publicKey: credentialPublicKey,
      algorithm: "ES256" as const,
      transports: [],
    };

    try {
      await verifyAuthentication(authData, credential, challengeRes.challenge);
    } catch (verifErr) {
      console.error("Signature validation failure:", verifErr);
      return { success: false, error: "Signature validation failed." };
    }

    let setupContent = getEnvRawContent(envPathObj);
    setupContent = setupContent
      .replace(/^SUPER_ADMIN_SIGNATURE=.*$/gm, "")
      .trim();
    const signatureBlob = Buffer.from(JSON.stringify(authData)).toString(
      "base64",
    );
    setupContent += `\n\n# PART 6: Configuration Immutable Signature via FIDO2\nSUPER_ADMIN_SIGNATURE="${signatureBlob}"`;
    saveEnvRawContent(envPathObj, setupContent);

    return await finalizeSetupEnvironment();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function clearSuperAdminConfig() {
  try {
    await copyEnvToSetupAndStripSignature();
    await webAuthnRepo.clearSuperAdmins();
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getAdminList() {
  try {
    const dbUrl = await getDbUrl();
    const admins = await setupRepo.findAdmins(dbUrl);
    const data = admins.map((a) => ({
      address: a.address,
      name: a.name,
      role: a.role,
      createdAt: a.createdAt,
    }));
    return { success: true, data };
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    if (errStr.includes("Authentication failed")) {
      return {
        success: false,
        error:
          "Database authentication failed. The database password in your configuration file does not match the underlying running Docker database volume. Please reset the database.",
      };
    }
    return { success: false, error: errStr };
  }
}
