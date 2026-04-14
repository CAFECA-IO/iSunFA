"use server";

import fs from "fs";
import path from "path";
import os from "os";
import crypto, { generateKeyPairSync } from "crypto";
import { publicClient, isuncoin } from "@/lib/viem_public";
import {
  createPublicClient,
  http,
  formatEther,
  parseAbi,
  parseAbiItem,
  stringToHex,
  createWalletClient,
} from "viem";
import { getAdminAccount } from "@/lib/wallet/admin_wallet";
import { dockerService } from "@/services/docker.service";
import { verifyAuthentication } from "@/lib/auth/fido2_server";
import { setupRepo } from "@/repositories/setup.repo";
import { reconstructKeyFromXY } from "@/lib/auth/crypto_utils";
import type { AuthenticationJSON } from "@passwordless-id/webauthn";
import { runCommand } from "@/services/cli.service";
import { validateEnvDetailed } from "@/validators/env";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import {
  ROOT_PATH,
  ENV_PATH,
  ENV_SETUP_PATH,
  ENV_EXAMPLE_PATH,
  updateOrAppendEnv,
  loadEnvConfig,
  getPriorityEnvConfig,
} from "@/services/env.service";

// Info: (20260414 - Luphia) 系統與 Docker 服務
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
  let envContent = "";
  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, "utf8");
  } else if (fs.existsSync(ENV_EXAMPLE_PATH)) {
    envContent = fs.readFileSync(ENV_EXAMPLE_PATH, "utf8");
  }

  // Info: (20260414 - Luphia) 產生 24 字元高複雜度密碼
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let newPassword = "";
  for (let i = 0; i < 24; i++) {
    newPassword += charset[crypto.randomInt(0, charset.length)];
  }

  // Info: (20260414 - Luphia) 強制寫入資料庫設定
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

  fs.writeFileSync(ENV_PATH, envContent, "utf8");

  // Info: (20260413 - Luphia) 寫入靜態設定至 .env.setup
  if (!fs.existsSync(ENV_SETUP_PATH)) {
    fs.writeFileSync(ENV_SETUP_PATH, "", "utf-8");
  }

  let setupContent = fs.readFileSync(ENV_SETUP_PATH, "utf-8");
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
    "NEXT_PUBLIC_RPC_URL",
    "https://mainnet.isuncoin.com",
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

  fs.writeFileSync(ENV_SETUP_PATH, setupContent, "utf8");

  return await dockerService.composeUp(ROOT_PATH);
}

// Info: (20260413 - Luphia) 錢包與區塊鏈服務
export async function getAdminWalletInfo() {
  try {
    let adminAccount;
    try {
      adminAccount = await getAdminAccount();
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
    const address = adminAccount.address;

    const envConfig = await loadEnvConfig(ENV_PATH);
    const rpcUrl =
      envConfig.NEXT_PUBLIC_RPC_URL ||
      process.env.NEXT_PUBLIC_RPC_URL ||
      "http://127.0.0.1:20024";

    const localPublicClient = createPublicClient({ transport: http(rpcUrl) });
    const balanceWei = await localPublicClient.getBalance({ address });
    const balanceEth = formatEther(balanceWei);

    let isMining = false;
    try {
      const miningRes = await dockerService.execContainer(
        "blockchain",
        `isuncoin attach --exec "eth.mining" http://127.0.0.1:20024`,
      );
      if (miningRes.success && miningRes.output) {
        isMining = miningRes.output.includes("true");
      }
    } catch (e) {
      console.warn("Failed to check mining status via attach:", e);
    }

    let isfBalance = "0.0";
    const setupConfig = await loadEnvConfig(ENV_SETUP_PATH);
    const cpAddress = setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS;

    if (cpAddress) {
      try {
        const cpAbi = parseAbi([
          "function balanceOf(address account) external view returns (uint256)",
        ]);
        const isfWei = await localPublicClient.readContract({
          address: cpAddress as `0x${string}`,
          abi: cpAbi,
          functionName: "balanceOf",
          args: [address],
        });
        isfBalance = formatEther(isfWei);
      } catch (e) {
        console.warn("Could not read ISF balance:", e);
      }
    }

    return {
      success: true,
      address,
      balance: balanceEth,
      isfBalance,
      isMining: !!isMining,
    };
  } catch (error: unknown) {
    console.error("Error reading wallet info:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function toggleMining(start: boolean) {
  try {
    let adminAccount;
    try {
      adminAccount = await getAdminAccount();
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
    const address = adminAccount.address;

    const cmd = start
      ? `isuncoin attach --exec "miner.setEtherbase('${address.trim()}'); miner.start(5)" http://127.0.0.1:20024`
      : `isuncoin attach --exec "miner.stop()" http://127.0.0.1:20024`;

    return await dockerService.execContainer("blockchain", cmd);
  } catch (error: unknown) {
    console.error("Error toggling mining:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Info: (20260413 - Luphia) 資料庫服務
async function getDbUrl() {
  const envConfig = await getPriorityEnvConfig();
  return envConfig.DATABASE_URL || process.env.DATABASE_URL || "";
}

export async function initDb() {
  const envConfig = await loadEnvConfig(ENV_PATH);
  const dbPassword = envConfig.POSTGRES_PASSWORD || "isunfa";
  const dbPasswordEncoded = encodeURIComponent(dbPassword);
  const dbUrl = `postgresql://isunfa:${dbPasswordEncoded}@127.0.0.1:20021/isunfa?schema=public`;

  // Info: (20260413 - Luphia) 安全跳脫 SQL 字元
  const sqlPassword = dbPassword.replace(/'/g, "''");
  const bashSafeSqlStr =
    `ALTER USER isunfa WITH PASSWORD '${sqlPassword}';`.replace(/'/g, "'\\''");
  const dockerCmd = `psql -U isunfa -d isunfa -c '${bashSafeSqlStr}'`;
  await dockerService.execContainer("database", dockerCmd);

  const cmd = `DATABASE_URL='${dbUrl.replace(/'/g, "'\\''")}' npx prisma db push --accept-data-loss`;
  const result = await runCommand(cmd, ROOT_PATH, 5 * 1024 * 1024);

  if (result.success) {
    if (!fs.existsSync(ENV_SETUP_PATH)) {
      fs.writeFileSync(ENV_SETUP_PATH, "", "utf-8");
    }

    let setupContent = fs.readFileSync(ENV_SETUP_PATH, "utf-8");
    if (!setupContent.includes("# PART 3")) {
      setupContent += "\n\n# PART 3: Database Configuration\n";
    }

    setupContent = updateOrAppendEnv(setupContent, "POSTGRES_DB", "isunfa");
    setupContent = updateOrAppendEnv(setupContent, "POSTGRES_USER", "isunfa");
    setupContent = updateOrAppendEnv(
      setupContent,
      "POSTGRES_PASSWORD",
      dbPassword,
    );
    setupContent = updateOrAppendEnv(setupContent, "DATABASE_URL", dbUrl);

    fs.writeFileSync(ENV_SETUP_PATH, setupContent, "utf-8");
    console.log(
      "-> Successfully synchronized database password and pushed schema.",
    );
  }

  return result;
}

export async function getDatabaseStatus() {
  try {
    const envConfig = await loadEnvConfig(ENV_PATH);
    const dbPassword = envConfig.POSTGRES_PASSWORD || "";

    const schemaPath = path.join(ROOT_PATH, "prisma", "schema.prisma");
    const content = fs.existsSync(schemaPath)
      ? fs.readFileSync(schemaPath, "utf8")
      : "";
    const tableCount = (content.match(/^model\s+/gm) || []).length;

    const dbUrlString = envConfig.DATABASE_URL
      ? envConfig.DATABASE_URL.replace(/^"(.*)"$/, "$1")
      : "postgresql://isunfa@127.0.0.1:20021/isunfa";
    let dbHost = "127.0.0.1";
    let dbPort = "20021";
    try {
      const urlObj = new URL(dbUrlString);
      dbHost = urlObj.hostname;
      dbPort = urlObj.port || "5432";
    } catch {}

    return {
      success: true,
      tableCount,
      dbPassword: dbPassword.replace(/^"(.*)"$/, "$1"),
      dbHost,
      dbPort,
    };
  } catch (e) {
    return {
      success: false,
      error: String(e),
      tableCount: 0,
      dbPassword: "",
      dbHost: "127.0.0.1",
      dbPort: "20021",
    };
  }
}

export async function setDbPassword(newPassword: string) {
  try {
    let envContent = fs.existsSync(ENV_PATH)
      ? fs.readFileSync(ENV_PATH, "utf8")
      : "";

    envContent = updateOrAppendEnv(
      envContent,
      "POSTGRES_PASSWORD",
      `"${newPassword}"`,
    );
    const encodedPassword = encodeURIComponent(newPassword);
    const dbUrl = `postgresql://isunfa:${encodedPassword}@127.0.0.1:20021/isunfa?schema=public`;
    envContent = updateOrAppendEnv(envContent, "DATABASE_URL", `"${dbUrl}"`);

    fs.writeFileSync(ENV_PATH, envContent, "utf8");
    return await initDb();
  } catch (e) {
    return { success: false, output: String(e) };
  }
}

// Info: (20260413 - Luphia) 身份驗證與管理員機制
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
        // Info: (20260414 - Luphia) Prefer envCredId from .env or .env.setup over old DB record during setup/replace flows
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
            "Database authentication failed. The database password in your configuration file does not match the underlying running Docker database volume. This typically happens if you restart the setup wizard but keep the old Docker volume. Please remove the old database volume or manually restore your database credentials.",
        };
      }
      return { success: false, error: "Database connection failed: " + errStr };
    }

    const envConfig = await getPriorityEnvConfig();
    const targetEnvPath = fs.existsSync(ENV_SETUP_PATH)
      ? ENV_SETUP_PATH
      : ENV_PATH;

    if (user && user.credentialId) {
      if (!authentication || user.credentialId === authentication.id) {
        let setupContent = fs.readFileSync(targetEnvPath, "utf-8");
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
        fs.writeFileSync(targetEnvPath, setupContent, "utf-8");

        return { success: true };
      }
    }

    if (authentication && authentication.id) {
      // Info: (20260414 - Luphia) Gather all known possible factory addresses to maximize recovery chances
      const factoryAddresses = new Set<`0x${string}`>();
      if (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS)
        factoryAddresses.add(
          envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`,
        );
      if (process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS)
        factoryAddresses.add(
          process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`,
        );

      const backupEnvPaths = [ENV_PATH];
      for (const backupPath of backupEnvPaths) {
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

            let setupContent = fs.readFileSync(targetEnvPath, "utf-8");
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
            fs.writeFileSync(targetEnvPath, setupContent, "utf-8");

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
    let factoryAddress = process.env
      .NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`;
    const envConfig = await getPriorityEnvConfig();

    if (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS) {
      factoryAddress =
        envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`;
    }

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
          credentialId: credentialId,
          pubKeyX: pubKeyX,
          pubKeyY: pubKeyY,
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

    const globalAny = global as typeof globalThis & {
      superAdminTaskStatus?: {
        done: boolean;
        error: string | null;
        progress: string;
      };
    };
    globalAny.superAdminTaskStatus = {
      done: false,
      error: null,
      progress: "Initializing admin wallet...",
    };

    const doBlockchainSetup = async () => {
      try {
        let adminAccount;
        try {
          adminAccount = await getAdminAccount();
        } catch {}

        if (adminAccount) {
          globalAny.superAdminTaskStatus = {
            done: false,
            error: null,
            progress: "Connecting to Blockchain...",
          };
          const setupConfig = await loadEnvConfig(ENV_SETUP_PATH);
          const rpcUrl =
            setupConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";

          const mainWalletClient = createWalletClient({
            chain: isuncoin,
            account: adminAccount,
            transport: http(rpcUrl),
          });

          // Info: (20260414 - Luphia) 0. Ensure Smart Contract Wallet (SCW) is deployed
          globalAny.superAdminTaskStatus = {
            done: false,
            error: null,
            progress: "Deploying SCW (Account Abstraction) Wallet...",
          };
          const factoryAbi = parseAbi([
            "function getAccountByCredentialId(bytes) view returns (address)",
            "function createAccount(bytes, uint256, uint256, uint256, string, string) external returns (address)",
          ]);

          const existingScw = await publicClient.readContract({
            address: factoryAddress,
            abi: factoryAbi,
            functionName: "getAccountByCredentialId",
            args: [stringToHex(credentialId)],
          });

          if (existingScw === "0x0000000000000000000000000000000000000000") {
            const deployTx = await mainWalletClient.writeContract({
              address: factoryAddress,
              abi: factoryAbi,
              functionName: "createAccount",
              args: [
                stringToHex(credentialId),
                BigInt(pubKeyX),
                BigInt(pubKeyY),
                BigInt(0),
                name,
                "",
              ],
            });
            await publicClient.waitForTransactionReceipt({ hash: deployTx });
          }

          // Info: (20260413 - Luphia) 1. Set KYC Status
          if (setupConfig.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS) {
            globalAny.superAdminTaskStatus = {
              done: false,
              error: null,
              progress: "Setting KYC Levels...",
            };
            const irAddress =
              setupConfig.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS as `0x${string}`;
            const irAbi = parseAbi([
              "function updateKYC(address, uint8) external",
              "function getKYCLevel(address) view returns (uint8)",
            ]);

            const kycLevel = await publicClient.readContract({
              address: irAddress,
              abi: irAbi,
              functionName: "getKYCLevel",
              args: [address],
            });
            if (kycLevel === 0) {
              const tx = await mainWalletClient.writeContract({
                address: irAddress,
                abi: irAbi,
                functionName: "updateKYC",
                args: [address, 1],
              });
              await publicClient.waitForTransactionReceipt({ hash: tx });
            }

            const adminKycLevel = await publicClient.readContract({
              address: irAddress,
              abi: irAbi,
              functionName: "getKYCLevel",
              args: [adminAccount.address],
            });
            if (adminKycLevel === 0) {
              const adminTx = await mainWalletClient.writeContract({
                address: irAddress,
                abi: irAbi,
                functionName: "updateKYC",
                args: [adminAccount.address, 1],
              });
              await publicClient.waitForTransactionReceipt({ hash: adminTx });
            }
          }

          // Info: (20260413 - Luphia) 2. Grant DEFAULT_ADMIN_ROLE
          const accessControlAbi = parseAbi([
            "function grantRole(bytes32 role, address account) external",
          ]);
          const DEFAULT_ADMIN_ROLE =
            "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
          const contractsToTransfer = [
            setupConfig.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS,
            setupConfig.NEXT_PUBLIC_DYNAMIC_MEMBERSHIP_CARD_ADDRESS,
            setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS,
            setupConfig.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS,
          ].filter(Boolean);

          for (const contractAddr of contractsToTransfer) {
            globalAny.superAdminTaskStatus = {
              done: false,
              error: null,
              progress: `Granting Admin Role...`,
            };
            const tx = await mainWalletClient.writeContract({
              address: contractAddr as `0x${string}`,
              abi: accessControlAbi,
              functionName: "grantRole",
              args: [DEFAULT_ADMIN_ROLE, address],
            });
            await publicClient.waitForTransactionReceipt({ hash: tx });
          }

          // Info: (20260413 - Luphia) 3. Mint ISF
          if (setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS) {
            globalAny.superAdminTaskStatus = {
              done: false,
              error: null,
              progress: "Minting collateral...",
            };
            const cpAddress =
              setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS as `0x${string}`;
            const cpAbi = parseAbi([
              "function collateralizedMint(address to, uint256 amount) external payable",
            ]);
            const mintTx = await mainWalletClient.writeContract({
              address: cpAddress,
              abi: cpAbi,
              functionName: "collateralizedMint",
              args: [adminAccount.address, 100n * 10n ** 18n],
              value: 5n * 10n ** 18n,
            });
            await publicClient.waitForTransactionReceipt({ hash: mintTx });
          }
        }
        globalAny.superAdminTaskStatus = {
          done: true,
          error: null,
          progress: "Completed",
        };
      } catch (e) {
        console.error("Error securing contracts:", e);
        globalAny.superAdminTaskStatus = {
          done: true,
          error: String(e),
          progress: "Failed",
        };
      }
    };

    void doBlockchainSetup();

    const targetEnvPath = fs.existsSync(ENV_SETUP_PATH)
      ? ENV_SETUP_PATH
      : ENV_PATH;
    if (fs.existsSync(targetEnvPath)) {
      let setupContent = fs.readFileSync(targetEnvPath, "utf-8");
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

      fs.writeFileSync(targetEnvPath, setupContent, "utf-8");
    }

    return { success: true, address, pendingTask: true };
  } catch (err: unknown) {
    const errStr = err instanceof Error ? err.message : String(err);
    if (errStr.includes("Authentication failed")) {
      return {
        success: false,
        error:
          "Database authentication failed. The database password in your configuration file does not match the underlying running Docker database volume. This typically happens if you restart the setup wizard but keep the old Docker volume. Please remove the old database volume or manually restore your database credentials.",
      };
    }
    return {
      success: false,
      error: errStr,
    };
  }
}

export async function getSuperAdminTaskStatus() {
  return (
    (
      global as typeof globalThis & {
        superAdminTaskStatus?: {
          done: boolean;
          error: string | null;
          progress: string;
        };
      }
    ).superAdminTaskStatus || { done: true, error: null, progress: "Idle" }
  );
}

// Info: (20260413 - Luphia) 環境設定與驗證收尾
export async function finalizeSetupEnvironment() {
  if (fs.existsSync(ENV_SETUP_PATH)) {
    const setupContent = fs.readFileSync(ENV_SETUP_PATH, "utf8");
    let envContent = fs.existsSync(ENV_PATH)
      ? fs.readFileSync(ENV_PATH, "utf-8")
      : "";

    setupContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") {
        if (trimmed !== "" && !envContent.includes(trimmed)) {
          envContent +=
            (envContent.endsWith("\n") || envContent === "" ? "" : "\n") +
            `${trimmed}\n`;
        }
      } else {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          envContent = updateOrAppendEnv(envContent, match[1], match[2]);
        }
      }
    });

    fs.writeFileSync(ENV_PATH, envContent, "utf-8");
    fs.unlinkSync(ENV_SETUP_PATH);
    return { success: true };
  }
  return { success: false, error: "Setup file not found." };
}

export async function getEnvHashChallenge(): Promise<{
  success: boolean;
  challenge?: string;
  error?: string;
}> {
  try {
    const targetEnvPath = fs.existsSync(ENV_SETUP_PATH)
      ? ENV_SETUP_PATH
      : fs.existsSync(ENV_PATH)
        ? ENV_PATH
        : undefined;
    if (!targetEnvPath)
      return { success: false, error: "Configuration file not found" };

    const config = await getPriorityEnvConfig();

    delete config["SUPER_ADMIN_SIGNATURE"];

    const sortedKeys = Object.keys(config).sort();
    const stableString = sortedKeys.map((k) => `${k}=${config[k]}`).join("\n");

    const hashBuffer = crypto
      .createHash("sha256")
      .update(stableString)
      .digest();
    const challenge = hashBuffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return { success: true, challenge };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function verifyAndFinalizeConfig(
  authData: AuthenticationJSON,
): Promise<{ success: boolean; error?: string }> {
  try {
    const envPathObj = fs.existsSync(ENV_SETUP_PATH)
      ? ENV_SETUP_PATH
      : path.join(ROOT_PATH, ".env");
    if (!fs.existsSync(envPathObj))
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

    // Info: (20260414 - Luphia) Robustly normalize credential IDs across Base64 and Base64URL formats
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

    let setupContent = fs.readFileSync(envPathObj, "utf-8");
    setupContent = setupContent
      .replace(/^SUPER_ADMIN_SIGNATURE=.*$/gm, "")
      .trim();
    const signatureBlob = Buffer.from(JSON.stringify(authData)).toString(
      "base64",
    );
    setupContent += `\n\n# PART 6: Configuration Immutable Signature via FIDO2\nSUPER_ADMIN_SIGNATURE="${signatureBlob}"`;
    fs.writeFileSync(envPathObj, setupContent, "utf-8");

    return await finalizeSetupEnvironment();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function saveExternalConfig(config: {
  appUrl: string;
  gaId: string;
  geminiKey: string;
  oenToken: string;
  oenMerchant: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    let content = fs.existsSync(ENV_SETUP_PATH)
      ? fs.readFileSync(ENV_SETUP_PATH, "utf-8")
      : "";

    if (!content.includes("# PART 5"))
      content += "\n\n# PART 5: External API Configuration\n";

    content = updateOrAppendEnv(
      content,
      "NEXT_PUBLIC_APP_URL",
      `"${config.appUrl}"`,
    );
    if (config.gaId)
      content = updateOrAppendEnv(
        content,
        "NEXT_PUBLIC_GA_MEASUREMENT_ID",
        `"${config.gaId}"`,
      );
    if (config.geminiKey)
      content = updateOrAppendEnv(
        content,
        "GEMINI_API_KEY",
        `"${config.geminiKey}"`,
      );
    if (config.oenToken)
      content = updateOrAppendEnv(
        content,
        "OEN_ACCESS_TOKEN",
        `"${config.oenToken}"`,
      );
    if (config.oenMerchant)
      content = updateOrAppendEnv(
        content,
        "OEN_MERCHANT_ID",
        `"${config.oenMerchant}"`,
      );
    content = updateOrAppendEnv(content, "REPORT_OUTPUT_DIR", `"reports"`);
    content = updateOrAppendEnv(content, "MODEL", `"gemini-2.5-pro"`);

    fs.writeFileSync(ENV_SETUP_PATH, content, "utf-8");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getExternalConfig() {
  try {
    const config = await getPriorityEnvConfig();
    if (Object.keys(config).length > 0) {
      return {
        success: true,
        data: {
          appUrl: config.NEXT_PUBLIC_APP_URL || "https://isunfa.localhost",
          gaId: config.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-ZNVVW7JP0N",
          geminiKey: config.GEMINI_API_KEY || "",
          oenToken: config.OEN_ACCESS_TOKEN || "",
          oenMerchant: config.OEN_MERCHANT_ID || "mermer",
        },
      };
    }
    return { success: false, error: "No config file found" };
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

export async function createAdminRecord(
  credentialId: string,
  pubKeyX: string,
  pubKeyY: string,
  name: string = "SERVER ADMIN",
) {
  try {
    let factoryAddress = process.env
      .NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`;
    const envConfig = await getPriorityEnvConfig();

    if (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS) {
      factoryAddress =
        envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`;
    }

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
      let adminAccount;
      try {
        adminAccount = await getAdminAccount();
      } catch {}
      if (adminAccount) {
        const rpcUrl =
          envConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
        const mainWalletClient = createWalletClient({
          chain: isuncoin,
          account: adminAccount,
          transport: http(rpcUrl),
        });

        // Info: (20260414 - Luphia) 0. Ensure Smart Contract Wallet (SCW) is deployed for secondary admin
        const factoryAbi = parseAbi([
          "function getAccountByCredentialId(bytes) view returns (address)",
          "function createAccount(bytes, uint256, uint256, uint256, string, string) external returns (address)",
        ]);

        const existingScw = await publicClient.readContract({
          address: factoryAddress,
          abi: factoryAbi,
          functionName: "getAccountByCredentialId",
          args: [stringToHex(credentialId)],
        });

        if (existingScw === "0x0000000000000000000000000000000000000000") {
          const deployTx = await mainWalletClient.writeContract({
            address: factoryAddress,
            abi: factoryAbi,
            functionName: "createAccount",
            args: [
              stringToHex(credentialId),
              BigInt(pubKeyX),
              BigInt(pubKeyY),
              BigInt(0),
              name,
              "",
            ],
          });
          await publicClient.waitForTransactionReceipt({ hash: deployTx });
        }

        const accessControlAbi = parseAbi([
          "function grantRole(bytes32 role, address account) external",
        ]);
        const DEFAULT_ADMIN_ROLE =
          "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
        const contractsToTransfer = [
          envConfig.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS,
          envConfig.NEXT_PUBLIC_DYNAMIC_MEMBERSHIP_CARD_ADDRESS,
          envConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS,
          envConfig.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS,
        ].filter(Boolean);

        for (const contractAddr of contractsToTransfer) {
          const tx = await mainWalletClient.writeContract({
            address: contractAddr as `0x${string}`,
            abi: accessControlAbi,
            functionName: "grantRole",
            args: [DEFAULT_ADMIN_ROLE, address],
          });
          await publicClient.waitForTransactionReceipt({ hash: tx });
        }
      }
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
      const envConfig = await getPriorityEnvConfig();
      let adminAccount;
      try {
        adminAccount = await getAdminAccount();
      } catch {}

      if (adminAccount) {
        const rpcUrl =
          envConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
        const mainWalletClient = createWalletClient({
          chain: isuncoin,
          account: adminAccount,
          transport: http(rpcUrl),
        });

        const accessControlAbi = parseAbi([
          "function revokeRole(bytes32 role, address account) external",
        ]);
        const DEFAULT_ADMIN_ROLE =
          "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
        const contractsToTransfer = [
          envConfig.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS,
          envConfig.NEXT_PUBLIC_DYNAMIC_MEMBERSHIP_CARD_ADDRESS,
          envConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS,
          envConfig.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS,
        ].filter(Boolean);

        for (const contractAddr of contractsToTransfer) {
          const tx = await mainWalletClient.writeContract({
            address: contractAddr as `0x${string}`,
            abi: accessControlAbi,
            functionName: "revokeRole",
            args: [DEFAULT_ADMIN_ROLE, address as `0x${string}`],
          });
          await publicClient.waitForTransactionReceipt({ hash: tx });
        }
      }
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

export async function getEnvSignatureStatus() {
  const result = await validateEnvDetailed();

  if (
    result.status === "SIGNATURE_MISMATCH" ||
    (result.status === "MISSING_KEYS" &&
      result.missingKeys?.length === 1 &&
      result.missingKeys[0] === "SUPER_ADMIN_SIGNATURE")
  ) {
    copyEnvToSetupAndStripSignature();
  }

  return {
    success: true,
    status: result.status,
    missingKeys: result.missingKeys,
    envData: result.envData,
  };
}

export async function getEnvContentToSign() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath))
    return { success: false, error: "No .env file found" };

  const dotenvConfig = await loadEnvConfig(envPath);

  const excludeKeys = ["SUPER_ADMIN_SIGNATURE"];
  for (const k of excludeKeys) {
    if (k in dotenvConfig) delete dotenvConfig[k];
  }

  const sortedKeys = Object.keys(dotenvConfig).sort();
  const items = sortedKeys.map((k) => ({ key: k, value: dotenvConfig[k] }));

  return { success: true, items };
}

function copyEnvToSetupAndStripSignature() {
  const envSetupPath = path.join(process.cwd(), ".env.setup");
  const envPath = path.join(process.cwd(), ".env");

  if (fs.existsSync(envPath)) {
    let content = fs.readFileSync(envPath, "utf-8");
    // Info: (20260414 - Luphia) Strip PART 6 signature block entirely
    content = content.replace(
      /\n*# PART 6: Configuration Immutable Signature via FIDO2\nSUPER_ADMIN_SIGNATURE=.*$/gm,
      "",
    );
    content = content.replace(/^SUPER_ADMIN_SIGNATURE=.*$/gm, "");
    // Info: (20260414 - Luphia) Clean up multiple empty lines
    content = content.replace(/\n{3,}/g, "\n\n");

    fs.writeFileSync(envSetupPath, content, "utf-8");
  } else if (fs.existsSync(envSetupPath)) {
    let content = fs.readFileSync(envSetupPath, "utf-8");
    content = content.replace(
      /\n*# PART 6: Configuration Immutable Signature via FIDO2\nSUPER_ADMIN_SIGNATURE=.*$/gm,
      "",
    );
    content = content.replace(/^SUPER_ADMIN_SIGNATURE=.*$/gm, "");
    content = content.replace(/\n{3,}/g, "\n\n");

    fs.writeFileSync(envSetupPath, content, "utf-8");
  }
}

export async function clearSuperAdminConfig() {
  try {
    copyEnvToSetupAndStripSignature();

    // Info: (20260414 - Luphia) Also remove the SUPER_ADMIN from Prisma to ensure fresh state if they try to restore again
    await webAuthnRepo.clearSuperAdmins();

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
