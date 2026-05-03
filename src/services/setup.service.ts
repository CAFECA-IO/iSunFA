import os from "os";
import crypto, { generateKeyPairSync } from "crypto";
import { dockerService } from "@/services/docker.service";
import { setupRepo } from "@/repositories/setup.repo";
import { publicClient } from "@/lib/viem_public";
import { parseAbi, stringToHex } from "viem";
import {
  ROOT_PATH,
  ENV_PATH,
  ENV_SETUP_PATH,
  updateOrAppendEnv,
  getEnvRawContent,
  saveEnvRawContent,
  existsEnv,
  getPriorityEnvConfig,
} from "@/services/env.service";
import { getDbUrl } from "@/services/setup.db.service";
import {
  ensureSmartContractWallet,
  grantDefaultAdminRoles,
  revokeDefaultAdminRoles,
  setAccountKYCLevel,
} from "@/services/setup.blockchain.service";
import { setSuperAdminTaskStatus } from "@/services/setup.state.service";

// Info: (20260416 - Luphia) Docker Orchestration

export async function checkDockerInstalled() {
  return await dockerService.checkInstalled();
}

export async function checkDockerRunning() {
  return await dockerService.checkRunning();
}

export async function getRunningContainers() {
  return await dockerService.getRunningContainers();
}

export async function startDockerEngine() {
  return await dockerService.startEngine();
}

export async function getSystemHardwareInfo() {
  const cpus = os.cpus();
  const totalMemGB = (os.totalmem() / 1024 ** 3).toFixed(1);
  return {
    osType: os.type(),
    osRelease: os.release(),
    arch: os.arch(),
    cpuModel: cpus[0]?.model || "Unknown CPU",
    cpuCores: cpus.length,
    totalMemGB,
  };
}

export async function startDockerCompose() {
  let envContent = getEnvRawContent(ENV_PATH);

  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let newPassword = "";
  for (let i = 0; i < 24; i++) {
    newPassword += charset[crypto.randomInt(0, charset.length)];
  }

  envContent = updateOrAppendEnv(envContent, "POSTGRES_DB", "isunfa");
  envContent = updateOrAppendEnv(envContent, "POSTGRES_USER", "isunfa");
  envContent = updateOrAppendEnv(
    envContent,
    "POSTGRES_PASSWORD",
    `"${newPassword}"`,
  );
  envContent = updateOrAppendEnv(envContent, "POSTGRES_HOST", "127.0.0.1");
  envContent = updateOrAppendEnv(envContent, "POSTGRES_PORT", "20021");

  const encodedPassword = encodeURIComponent(newPassword);
  const dbUrl = `postgresql://isunfa:${encodedPassword}@127.0.0.1:20021/isunfa?schema=public`;
  envContent = updateOrAppendEnv(envContent, "DATABASE_URL", `"${dbUrl}"`);

  saveEnvRawContent(ENV_PATH, envContent);

  let setupContent = getEnvRawContent(ENV_SETUP_PATH);
  if (!setupContent.includes("# PART 1")) {
    setupContent += "# PART 1: Core Infrastructure\n";
  }

  setupContent = updateOrAppendEnv(setupContent, "POSTGRES_HOST", "127.0.0.1");
  setupContent = updateOrAppendEnv(setupContent, "POSTGRES_PORT", "20021");
  setupContent = updateOrAppendEnv(
    setupContent,
    "STORAGE_DOMAIN",
    "http://127.0.0.1:20022",
  );
  setupContent = updateOrAppendEnv(
    setupContent,
    "OSRM_ROUTER_URL",
    "http://127.0.0.1:20025",
  );
  setupContent = updateOrAppendEnv(
    setupContent,
    "NEXT_PUBLIC_RPC_URL",
    "http://127.0.0.1:20024",
  );
  setupContent = updateOrAppendEnv(
    setupContent,
    "NEXT_PUBLIC_BAIFA_EXPLORER",
    "https://baifa.io",
  );
  setupContent = updateOrAppendEnv(
    setupContent,
    "NEXT_PUBLIC_ISUNCOIN_CHAIN_ID",
    "8017",
  );
  setupContent = updateOrAppendEnv(
    setupContent,
    "REPORT_OUTPUT_DIR",
    "reports",
  );
  setupContent = updateOrAppendEnv(setupContent, "MISSION_DIR", "missions");
  setupContent = updateOrAppendEnv(setupContent, "ISSUE_DIR", "issues");

  saveEnvRawContent(ENV_SETUP_PATH, setupContent);

  return await dockerService.composeUp(ROOT_PATH);
}

// Info: (20260416 - Luphia) Core Administration Pipelines

export async function createSuperAdminRecord(
  credentialId: string,
  pubKeyX: string,
  pubKeyY: string,
  name: string = "ISUNFA SUPER ADMIN",
): Promise<{
  success: boolean;
  address?: string;
  error?: string;
  pendingTask?: boolean;
}> {
  try {
    const envConfig = await getPriorityEnvConfig();
    const factoryAddress = (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS ||
      process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS) as `0x${string}`;

    if (!factoryAddress)
      return {
        success: false,
        error: "NEXT_PUBLIC_SCW_FACTORY_ADDRESS is not set.",
      };

    const abi = parseAbi([
      "function getAddress(bytes credentialId, uint256 pubKeyX, uint256 pubKeyY, uint256 salt) view returns (address)",
    ]);
    const address = await publicClient.readContract({
      address: factoryAddress,
      abi,
      functionName: "getAddress",
      args: [
        stringToHex(credentialId),
        BigInt(pubKeyX),
        BigInt(pubKeyY),
        BigInt(0),
      ],
    });

    const dbUrl = await getDbUrl();
    const existingByCred = await setupRepo.findUserByCredentialId(
      dbUrl,
      credentialId,
    );

    if (existingByCred) {
      if (existingByCred.address !== address.toLowerCase()) {
        await setupRepo.upsertSuperAdminByAddress(dbUrl, {
          address: address.toLowerCase(),
          credentialId,
          pubKeyX,
          pubKeyY,
          name: existingByCred.name || name,
        });
      }
    } else {
      const existingByAddr = await setupRepo.findUserByAddress(
        dbUrl,
        address.toLowerCase(),
      );
      if (!existingByAddr) {
        await setupRepo.downgradeAllSuperAdminsToUser(dbUrl);
        await setupRepo.createUser(dbUrl, {
          address: address.toLowerCase(),
          pubKeyX,
          pubKeyY,
          credentialId,
          role: "SUPER_ADMIN",
          name,
        });
      }
    }

    await setSuperAdminTaskStatus({
      done: false,
      error: null,
      progress: "Initializing admin wallet...",
    });

    const doBlockchainSetup = async () => {
      try {
        await setSuperAdminTaskStatus({
          done: false,
          error: null,
          progress: "Deploying SCW (Account Abstraction) Wallet...",
        });
        await ensureSmartContractWallet(credentialId, pubKeyX, pubKeyY, name);

        await setSuperAdminTaskStatus({
          done: false,
          error: null,
          progress: "Setting KYC Levels...",
        });
        await setAccountKYCLevel(address, 10);

        await setSuperAdminTaskStatus({
          done: false,
          error: null,
          progress: "Granting Admin Role...",
        });
        await grantDefaultAdminRoles(address);

        await setSuperAdminTaskStatus({
          done: true,
          error: null,
          progress: "Completed",
        });
      } catch (e) {
        console.error("Error securing contracts:", e);
        await setSuperAdminTaskStatus({
          done: true,
          error: String(e),
          progress: "Failed",
        });
      }
    };

    void doBlockchainSetup();

    const targetEnvPath = existsEnv(ENV_SETUP_PATH) ? ENV_SETUP_PATH : ENV_PATH;
    if (existsEnv(targetEnvPath)) {
      let setupContent = getEnvRawContent(targetEnvPath);
      if (!setupContent.includes("# PART 4"))
        setupContent += "\n\n# PART 4: Server SUPER ADMIN\n";

      const { privateKey } = generateKeyPairSync("ec", {
        namedCurve: "prime256v1",
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

      setupContent = updateOrAppendEnv(
        setupContent,
        "DEWT_PRIVATE_KEY_PEM",
        `"${privateKey.replace(/\n/g, "\\n")}"`,
      );
      setupContent = updateOrAppendEnv(
        setupContent,
        "SUPER_ADMIN_CRED_ID",
        credentialId,
      );
      setupContent = updateOrAppendEnv(
        setupContent,
        "SUPER_ADMIN_PUB_X",
        pubKeyX,
      );
      setupContent = updateOrAppendEnv(
        setupContent,
        "SUPER_ADMIN_PUB_Y",
        pubKeyY,
      );
      saveEnvRawContent(targetEnvPath, setupContent);
    }

    return { success: true, address, pendingTask: true };
  } catch (err: unknown) {
    const errStr = err instanceof Error ? err.message : String(err);
    if (errStr.includes("Authentication failed")) {
      return { success: false, error: "Database authentication failed." };
    }
    return { success: false, error: errStr };
  }
}

export async function createAdminRecord(
  credentialId: string,
  pubKeyX: string,
  pubKeyY: string,
  name: string = "SERVER ADMIN",
) {
  try {
    const envConfig = await getPriorityEnvConfig();
    const factoryAddress = (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS ||
      process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS) as `0x${string}`;
    if (!factoryAddress)
      return {
        success: false,
        error: "NEXT_PUBLIC_SCW_FACTORY_ADDRESS is not set.",
      };

    const abi = parseAbi([
      "function getAddress(bytes credentialId, uint256 pubKeyX, uint256 pubKeyY, uint256 salt) view returns (address)",
    ]);
    const address = await publicClient.readContract({
      address: factoryAddress,
      abi,
      functionName: "getAddress",
      args: [
        stringToHex(credentialId),
        BigInt(pubKeyX),
        BigInt(pubKeyY),
        BigInt(0),
      ],
    });

    const dbUrl = await getDbUrl();
    const existing = await setupRepo.findUserByAddress(
      dbUrl,
      address.toLowerCase(),
    );

    if (!existing) {
      await setupRepo.createUser(dbUrl, {
        address: address.toLowerCase(),
        pubKeyX,
        pubKeyY,
        credentialId,
        role: "ADMIN",
        name,
      });
    } else if (existing.role === "USER") {
      await setupRepo.updateUser(dbUrl, address.toLowerCase(), {
        role: "ADMIN",
        name,
      });
    }

    try {
      await ensureSmartContractWallet(credentialId, pubKeyX, pubKeyY, name);
      await grantDefaultAdminRoles(address);
    } catch (e) {
      console.error("Error securing contracts with secondary manager:", e);
    }
    return { success: true, address };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function deleteAdminRecord(address: string) {
  try {
    const dbUrl = await getDbUrl();
    await setupRepo.deleteUserByAddress(dbUrl, address.toLowerCase());
    try {
      await revokeDefaultAdminRoles(address);
    } catch (e) {
      console.error("Error revoking contracts from secondary manager:", e);
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
