"use server";

import fs from "fs";
import path from "path";
import crypto, { generateKeyPairSync } from "crypto";
import { PrismaClient } from "@/generated/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { publicClient, isuncoin } from "@/lib/viem_public";
import { createPublicClient, http, formatEther, parseAbi, stringToHex, createWalletClient } from "viem";
import { getAdminAccount } from "@/lib/wallet/admin_wallet";
import { dockerService } from "@/services/docker.service";
import { verifyAuthentication } from "@/lib/auth/fido2_server";
import { reconstructKeyFromXY } from "@/lib/auth/crypto_utils";
import type { AuthenticationJSON } from "@passwordless-id/webauthn";
import { runCommand } from "@/services/cli.service";

export async function checkDockerInstalled() {
  const result = await dockerService.checkInstalled();
  return result;
}

export async function checkDockerRunning() {
  const result = await dockerService.checkRunning();
  return result;
}

export async function startDockerEngine() {
  const result = await dockerService.startEngine();
  return result;
}


export async function startDockerCompose() {
  const rootPath = process.cwd();
  const envPath = path.join(rootPath, ".env");
  const examplePath = path.join(rootPath, ".env.example");

  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  } else if (fs.existsSync(examplePath)) {
    envContent = fs.readFileSync(examplePath, "utf8");
  }

  // Info: (20260412 - Luphia) Generate 24-character high-complexity password
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let newPassword = "";
  for (let i = 0; i < 24; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    newPassword += charset[randomIndex];
  }

  const updateOrAppend = (key: string, value: string, content: string) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (content.match(regex)) {
      return content.replace(regex, () => `${key}=${value}`);
    }
    return content + `\n${key}=${value}`;
  };

  // Info: (20260412 - Luphia) Enforce DB config
  envContent = updateOrAppend("POSTGRES_DB", "isunfa", envContent);
  envContent = updateOrAppend("POSTGRES_USER", "isunfa", envContent);
  envContent = updateOrAppend("POSTGRES_PASSWORD", `"${newPassword}"`, envContent);
  envContent = updateOrAppend("POSTGRES_HOST", "127.0.0.1", envContent);
  envContent = updateOrAppend("POSTGRES_PORT", "20021", envContent);

  const encodedPassword = encodeURIComponent(newPassword);
  const dbUrl = `postgresql://isunfa:${encodedPassword}@127.0.0.1:20021/isunfa?schema=public`;
  envContent = updateOrAppend("DATABASE_URL", `"${dbUrl}"`, envContent);

  fs.writeFileSync(envPath, envContent, "utf8");

  // Info: (20260412 - Luphia) Write required static configurations to .env.setup
  const envSetupPath = path.join(process.cwd(), ".env.setup");
  if (!fs.existsSync(envSetupPath)) {
    fs.writeFileSync(envSetupPath, "", "utf-8");
  }
  let setupContent = fs.readFileSync(envSetupPath, "utf-8");
  if (!setupContent.includes("# PART 3")) {
    setupContent += "# PART 3: Core Infrastructure";
  }

  setupContent = updateOrAppend("POSTGRES_HOST", "127.0.0.1", setupContent);
  setupContent = updateOrAppend("POSTGRES_PORT", "20021", setupContent);
  setupContent = updateOrAppend("STORAGE_DOMAIN", "http://127.0.0.1:20022", setupContent);
  setupContent = updateOrAppend("NEXT_PUBLIC_RPC_URL", "https://mainnet.isuncoin.com", setupContent);
  setupContent = updateOrAppend("NEXT_PUBLIC_BAIFA_EXPLORER", "https://baifa.io", setupContent);
  setupContent = updateOrAppend("NEXT_PUBLIC_ISUNCOIN_CHAIN_ID", "8017", setupContent);
  setupContent = updateOrAppend("REPORT_OUTPUT_DIR", "reports", setupContent);

  fs.writeFileSync(envSetupPath, setupContent, "utf8");

  // Info: (20260412 - Luphia) Execute docker compose in the root directory
  const result = await dockerService.composeUp(rootPath);
  return result;
}

export async function getAdminWalletInfo() {
  try {
    let adminAccount;
    try {
      adminAccount = await getAdminAccount();
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
    const address = adminAccount.address;

    // Info: (20260412 - Luphia) Read RPC URL from current process
    // Info: (20260412 - Luphia) Or forcibly read from .env if process.env gets stale
    const envPath = path.join(process.cwd(), ".env");
    let rpcUrl = "http://127.0.0.1:20024";

    if (fs.existsSync(envPath)) {
      const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
      const envConfig = dotenv.parse(fs.readFileSync(envPath, "utf8"));
      if (envConfig.NEXT_PUBLIC_RPC_URL) {
        rpcUrl = envConfig.NEXT_PUBLIC_RPC_URL;
      }
    } else {
      rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || rpcUrl;
    }

    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    const balanceWei = await publicClient.getBalance({ address });
    const balanceEth = formatEther(balanceWei);
    const isMining = await (publicClient as unknown as { request: (args: { method: string }) => Promise<boolean> }).request({ method: 'eth_mining' });

    let isfBalance = "0.0";
    const envSetupPath = path.join(process.cwd(), ".env.setup");
    let cpAddress: string | null = null;
    if (fs.existsSync(envSetupPath)) {
      const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
      const setupConfig = dotenv.parse(fs.readFileSync(envSetupPath, "utf8"));
      if (setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS) {
        cpAddress = setupConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS;
      }
    }

    if (cpAddress) {
      try {
        const cpAbi = parseAbi(["function balanceOf(address account) external view returns (uint256)"]);
        const isfWei = await publicClient.readContract({
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
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
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

    if (start) {
      // Info: (20260412 - Luphia) Start mining using isuncoin attach
      const cmd = `isuncoin attach --exec "miner.setEtherbase('${address.trim()}'); miner.start(5)" http://127.0.0.1:20024`;
      const result = await dockerService.execContainer("blockchain", cmd);
      return result;
    } else {
      // Info: (20260412 - Luphia) Stop mining
      const cmd = `isuncoin attach --exec "miner.stop()" http://127.0.0.1:20024`;
      const result = await dockerService.execContainer("blockchain", cmd);
      return result;
    }
  } catch (error: unknown) {
    console.error("Error toggling mining:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function initDb() {
  const rootPath = process.cwd();

  const envPath = path.join(process.cwd(), ".env");
  const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
  const envConfig = dotenv.parse(fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "");

  const dbPassword = envConfig.POSTGRES_PASSWORD || "isunfa";
  const dbPasswordEncoded = encodeURIComponent(dbPassword);
  const dbUrl = `postgresql://isunfa:${dbPasswordEncoded}@127.0.0.1:20021/isunfa?schema=public`;

  /**
   * Info: (20260412 - Luphia) Always force sync the DB password to match the one in .env
   * Safely escape SQL single quotes, then escape bash single quotes
   */
  const sqlPassword = dbPassword.replace(/'/g, "''");
  const sqlStr = `ALTER USER isunfa WITH PASSWORD '${sqlPassword}';`;
  const bashSafeSqlStr = sqlStr.replace(/'/g, "'\\''");
  const dockerCmd = `psql -U isunfa -d isunfa -c '${bashSafeSqlStr}'`;
  await dockerService.execContainer("database", dockerCmd);

  // Info: (20260412 - Luphia) Push DB schema using the synced configuration safely quoted to stop $ expansions
  const cmd = `DATABASE_URL='${dbUrl.replace(/'/g, "'\\''")}' npx prisma db push --accept-data-loss`;
  const result = await runCommand(cmd, rootPath, 5 * 1024 * 1024);

  if (result.success) {
    const envSetupPath = path.join(process.cwd(), ".env.setup");
    if (!fs.existsSync(envSetupPath)) {
      fs.writeFileSync(envSetupPath, "", "utf-8");
    }

    let envContent = fs.readFileSync(envSetupPath, "utf-8");
    if (!envContent.includes("# PART 6")) {
      envContent += "\n\n# PART 6: Database Configuration";
    }
    const updateEnv = (key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}="${value}"`);
      } else {
        envContent += `\n${key}="${value}"`;
      }
    };

    updateEnv("POSTGRES_DB", "isunfa");
    updateEnv("POSTGRES_USER", "isunfa");
    updateEnv("POSTGRES_PASSWORD", dbPassword);
    updateEnv("DATABASE_URL", dbUrl);

    fs.writeFileSync(envSetupPath, envContent, "utf-8");
    console.log("-> Successfully synchronized database password and pushed schema.");
  }

  return result;
}

export async function checkSuperAdminExists(): Promise<{ exists: boolean, address?: string, needsAuth?: boolean, credId?: string }> {
  try {
    const localPrisma = await getDynamicPrisma();
    const adminUser = await localPrisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    const envSetupPath = path.join(process.cwd(), ".env.setup");
    let envCredId, envPubX, envPubY;
    if (fs.existsSync(envSetupPath)) {
      const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
      const envConfig = dotenv.parse(fs.readFileSync(envSetupPath, "utf8"));
      envCredId = envConfig.SUPER_ADMIN_CRED_ID;
      envPubX = envConfig.SUPER_ADMIN_PUB_X;
      envPubY = envConfig.SUPER_ADMIN_PUB_Y;
    }

    if (adminUser) {
      if (adminUser.credentialId === "undefined" || !adminUser.credentialId) {
        // Info: (20260412 - Luphia) Delete corrupted super admin
        await localPrisma.user.delete({ where: { address: adminUser.address } });
        await localPrisma.$disconnect();
        return { exists: false };
      }
      await localPrisma.$disconnect();
      return { exists: true, address: adminUser.address, needsAuth: true, credId: adminUser.credentialId };
    }

    if (!adminUser && envCredId && envPubX && envPubY) {
      await localPrisma.$disconnect();
      return { exists: true, needsAuth: true, credId: envCredId };
    }

    await localPrisma.$disconnect();
    return { exists: false, address: undefined };
  } catch (err) {
    console.error("checkSuperAdminExists error:", err);
    return { exists: false };
  }
}

// Info: (20260413 - Luphia) Proceed with system config load AFTER the user explicitly authorizes via FIDO
export async function authorizeSuperAdmin(): Promise<{ success: boolean, address?: string, error?: string }> {
  try {
    const localPrisma = await getDynamicPrisma();
    const user = await localPrisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });

    if (user) {
      await createSuperAdminRecord(user.credentialId!, user.pubKeyX!, user.pubKeyY!);
      await localPrisma.$disconnect();
      return { success: true, address: user.address };
    }

    const envSetupPath = path.join(process.cwd(), ".env.setup");
    if (fs.existsSync(envSetupPath)) {
      const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
      const envConfig = dotenv.parse(fs.readFileSync(envSetupPath, "utf-8"));
      if (envConfig.SUPER_ADMIN_CRED_ID && envConfig.SUPER_ADMIN_PUB_X && envConfig.SUPER_ADMIN_PUB_Y) {
        const res = await createSuperAdminRecord(envConfig.SUPER_ADMIN_CRED_ID, envConfig.SUPER_ADMIN_PUB_X, envConfig.SUPER_ADMIN_PUB_Y);
        await localPrisma.$disconnect();
        return { success: res.success, address: res.address };
      }
    }

    await localPrisma.$disconnect();
    return { success: false, error: "Configuration not found" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function getDynamicPrisma() {
  const envSetupPath = path.join(process.cwd(), ".env.setup");
  const envPath = path.join(process.cwd(), ".env");
  const targetEnv = fs.existsSync(envSetupPath) ? envSetupPath : (fs.existsSync(envPath) ? envPath : null);

  let dbUrl = process.env.DATABASE_URL;
  if (targetEnv) {
    const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
    const envConfig = dotenv.parse(fs.readFileSync(targetEnv, "utf8"));
    if (envConfig.DATABASE_URL) dbUrl = envConfig.DATABASE_URL;
  }

  // Info: (20260412 - Luphia) Overwrite env explicitly to force PrismaClient to use the rotated password
  process.env.DATABASE_URL = dbUrl;
  const pool = new Pool({ connectionString: dbUrl || "" });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export async function createSuperAdminRecord(credentialId: string, pubKeyX: string, pubKeyY: string) {
  try {
    let factoryAddress = process.env.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`;
    const envPath = path.join(process.cwd(), ".env");
    const envSetupPath = path.join(process.cwd(), ".env.setup");

    // Info: (20260412 - Luphia) Dynamically read from .env.setup first, then .env
    const targetEnvPath = fs.existsSync(envSetupPath) ? envSetupPath : (fs.existsSync(envPath) ? envPath : null);
    if (targetEnvPath) {
      const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
      const envConfig = dotenv.parse(fs.readFileSync(targetEnvPath, "utf8"));
      if (envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS) {
        factoryAddress = envConfig.NEXT_PUBLIC_SCW_FACTORY_ADDRESS as `0x${string}`;
      }
    }

    if (!factoryAddress) {
      return { success: false, error: "NEXT_PUBLIC_SCW_FACTORY_ADDRESS is not set." };
    }

    const abi = parseAbi(["function getAddress(bytes credentialId, uint256 pubKeyX, uint256 pubKeyY, uint256 salt) view returns (address)"]);
    const address = await publicClient.readContract({
      address: factoryAddress,
      abi,
      functionName: "getAddress",
      args: [stringToHex(credentialId), BigInt(pubKeyX), BigInt(pubKeyY), BigInt(0)],
    });

    const localPrisma = await getDynamicPrisma();
    const existing = await localPrisma.user.findUnique({ where: { address: address.toLowerCase() } });
    if (!existing) {
      // Info: (20260413 - Luphia) Securely downgrade old SUPER ADMIN in case of forced registration overwrite to avoid FK constraint errors
      await localPrisma.user.updateMany({ where: { role: "SUPER_ADMIN" }, data: { role: "USER" } });
      await localPrisma.user.create({
        data: {
          address: address.toLowerCase(),
          pubKeyX,
          pubKeyY,
          credentialId,
          role: "SUPER_ADMIN",
          name: "ISUNFA SUPER ADMIN"
        },
      });
    }
    await localPrisma.$disconnect();

    // Info: (20260412 - Luphia) Automatically register ERC-3643 Wallet & Set as Contract Manager
    try {
      let adminAccount;
      try {
        adminAccount = await getAdminAccount();
      } catch {
        // Just ignore if it doesn't exist
      }

      if (adminAccount) {
        const targetEnvConfig = fs.existsSync(envSetupPath)
          ? await import("dotenv").then(m => ((m as unknown as { default?: typeof m }).default || m).parse(fs.readFileSync(envSetupPath, "utf8")))
          : {};
        const rpcUrl = targetEnvConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";

        const mainWalletClient = createWalletClient({
          chain: isuncoin,
          account: adminAccount,
          transport: http(rpcUrl),
        });

        // Info: (20260412 - Luphia) 1. Set KYC Status for Super Admin
        console.log("Setting KYC Level for Super Admin:", address);

        if (targetEnvConfig.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS) {
          const irAddress = targetEnvConfig.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS as `0x${string}`;
          const irAbi = parseAbi([
            "function updateKYC(address, uint8) external",
            "function getKYCLevel(address) view returns (uint8)"
          ]);

          const kycLevel = await publicClient.readContract({
            address: irAddress,
            abi: irAbi,
            functionName: "getKYCLevel",
            args: [address],
          });

          if (kycLevel === 0) {
            console.log("Setting KYC into KYCRegistry...");
            const tx = await mainWalletClient.writeContract({
              address: irAddress,
              abi: irAbi,
              functionName: "updateKYC",
              args: [address, 1], // Info: (20260413 - Luphia) Set KYC into KYCRegistry for Super Admin
            });
            await publicClient.waitForTransactionReceipt({ hash: tx });
          }

          // Info: (20260412 - Luphia) 1.5 Set KYC for .env.admin as well to allow minting ISF
          const adminKycLevel = await publicClient.readContract({
            address: irAddress,
            abi: irAbi,
            functionName: "getKYCLevel",
            args: [adminAccount.address],
          });

          if (adminKycLevel === 0) {
            console.log("Setting KYC into KYCRegistry for .env.admin...");
            const adminTx = await mainWalletClient.writeContract({
              address: irAddress,
              abi: irAbi,
              functionName: "updateKYC",
              args: [adminAccount.address, 1],
            });
            await publicClient.waitForTransactionReceipt({ hash: adminTx });
          }
        }

        // Info: (20260412 - Luphia) 2. Grant DEFAULT_ADMIN_ROLE of all Core Contracts to FIDO2 SCW Address
        const accessControlAbi = parseAbi(["function grantRole(bytes32 role, address account) external"]);
        const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
        const contractsToTransfer = [
          targetEnvConfig.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS,
          targetEnvConfig.NEXT_PUBLIC_DYNAMIC_MEMBERSHIP_CARD_ADDRESS,
          targetEnvConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS,
          targetEnvConfig.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS
        ];

        for (const contractAddr of contractsToTransfer) {
          if (contractAddr) {
            console.log("Granting DEFAULT_ADMIN_ROLE on", contractAddr, "to", address);
            const tx = await mainWalletClient.writeContract({
              address: contractAddr as `0x${string}`,
              abi: accessControlAbi,
              functionName: "grantRole",
              args: [DEFAULT_ADMIN_ROLE, address],
            });
            await publicClient.waitForTransactionReceipt({ hash: tx });
          }
        }

        // Info: (20260412 - Luphia) 3. Mint 100 ISF to .env.admin
        if (targetEnvConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS) {
          console.log("Minting 100 ISF to .env.admin...");
          const cpAddress = targetEnvConfig.NEXT_PUBLIC_CREDIT_POINT_ADDRESS as `0x${string}`;
          const cpAbi = parseAbi(["function collateralizedMint(address to, uint256 amount) external payable"]);

          const amount = 100n * 10n ** 18n; // Info: (20260412 - Luphia) 100 ISF
          const requiredISC = 5n * 10n ** 18n; // Info: (20260412 - Luphia) 5 ISC = 100 * 0.05

          const mintTx = await mainWalletClient.writeContract({
            address: cpAddress,
            abi: cpAbi,
            functionName: "collateralizedMint",
            args: [adminAccount.address, amount],
            value: requiredISC
          });
          await publicClient.waitForTransactionReceipt({ hash: mintTx });
          console.log("-> 100 ISF successfully minted to .env.admin.");
        }
      }
    } catch (e) {
      console.error("Error securing contracts with new manager:", e);
    }

    if (fs.existsSync(envSetupPath)) {
      let envContent = fs.readFileSync(envSetupPath, "utf-8");
      if (!envContent.includes("# PART 7")) {
        envContent += "\n\n# PART 7: Server SUPER ADMIN";
      }
      const updateEnv = (key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (envContent.match(regex)) {
          envContent = envContent.replace(regex, `${key}="${value}"`);
        } else {
          envContent += `\n${key}="${value}"`;
        }
      };


      const { privateKey } = generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      const dewtKeyPem = privateKey.replace(/\n/g, "\\n");
      updateEnv("DEWT_PRIVATE_KEY_PEM", dewtKeyPem);

      // Info: (20260412 - Luphia) Save SUPER_ADMIN credentials to allow auto-recovery if DB is wiped
      updateEnv("SUPER_ADMIN_CRED_ID", credentialId);
      updateEnv("SUPER_ADMIN_PUB_X", pubKeyX);
      updateEnv("SUPER_ADMIN_PUB_Y", pubKeyY);

      fs.writeFileSync(envSetupPath, envContent, "utf-8");
    }

    return { success: true, address };
  } catch (err) {
    console.error("createSuperAdminRecord error:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function finalizeSetupEnvironment() {
  const envPath = path.join(process.cwd(), ".env");
  const envSetupPath = path.join(process.cwd(), ".env.setup");

  if (fs.existsSync(envSetupPath)) {
    const setupContent = fs.readFileSync(envSetupPath, "utf8");
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

    const setupLines = setupContent.split(/\r?\n/);

    setupLines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") {
        if (trimmed !== "" && !envContent.includes(trimmed)) {
          // Info: (20260412 - Luphia) Ensure newline before appending
          if (envContent.length > 0 && !envContent.endsWith("\n")) envContent += "\n";
          envContent += `${trimmed}\n`;
        }
      } else {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1];
          const regex = new RegExp(`^${key}=.*$`, "m");
          if (envContent.match(regex)) {
            // Info: (20260412 - Luphia) ALWAYS Use function replacing to avoid $ capture group bugs
            envContent = envContent.replace(regex, () => trimmed);
          } else {
            if (envContent.length > 0 && !envContent.endsWith("\n")) envContent += "\n";
            envContent += `${trimmed}\n`;
          }
        }
      }
    });

    fs.writeFileSync(envPath, envContent, "utf-8");
    fs.unlinkSync(envSetupPath);
    return { success: true };
  }
  return { success: false, error: "Setup file not found." };
}

export async function getEnvHashChallenge(): Promise<{ success: boolean; challenge?: string; error?: string }> {
  try {
    const envSetupPath = path.join(process.cwd(), ".env.setup");
    if (!fs.existsSync(envSetupPath)) {
      return { success: false, error: ".env.setup not found" };
    }

    const envPath = path.join(process.cwd(), ".env");
    const envContentOrig = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

    const content = fs.readFileSync(envSetupPath, "utf-8");
    const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);

    // Info: (20260413 - Luphia) Mock the EXACT future state of .env by merging .env.setup into the current .env
    const baseConfig = dotenv.parse(envContentOrig);
    const setupConfig = dotenv.parse(content);
    const config = Object.assign({}, baseConfig, setupConfig);

    // Info: (20260413 - Luphia) Exclude signature before hashing
    const excludeKeys = ["SUPER_ADMIN_SIGNATURE"];
    for (const k of excludeKeys) {
      delete config[k];
    }

    // Info: (20260413 - Luphia) Build a perfectly deterministic string based strictly on key-value pairs
    const sortedKeys = Object.keys(config).sort();
    const stableString = sortedKeys.map(k => `${k}=${config[k]}`).join('\n');

    const crypto = await import("crypto");
    const hashBuffer = crypto.createHash('sha256').update(stableString).digest();

    // Info: (20260412 - Luphia) Base64url encoded challenge string format required by FIDO2
    const challenge = hashBuffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return { success: true, challenge };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function verifyAndFinalizeConfig(authData: AuthenticationJSON): Promise<{ success: boolean; error?: string }> {
  try {
    const envSetupPath = path.join(process.cwd(), ".env.setup");
    if (!fs.existsSync(envSetupPath)) {
      return { success: false, error: "Setup file not found" };
    }

    const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
    const envConfig = dotenv.parse(fs.readFileSync(envSetupPath, "utf-8"));

    const pubX = envConfig.SUPER_ADMIN_PUB_X;
    const pubY = envConfig.SUPER_ADMIN_PUB_Y;
    const credId = envConfig.SUPER_ADMIN_CRED_ID;

    if (!pubX || !pubY || !credId) {
      return { success: false, error: "SUPER_ADMIN credentials not found in setup file." };
    }
    if (authData.id !== credId) {
      return { success: false, error: "Wrong FIDO credential used." };
    }

    // Info: (20260412 - Luphia) Re-generate the expected challenge
    const challengeRes = await getEnvHashChallenge();
    if (!challengeRes.success || !challengeRes.challenge) {
      return { success: false, error: "Challenge hashing failed." };
    }

    const credentialPublicKey = reconstructKeyFromXY(pubX, pubY);
    const credential = {
      id: credId,
      publicKey: credentialPublicKey,
      algorithm: "ES256" as const,
      transports: [],
    };

    try {
      await verifyAuthentication(authData, credential, challengeRes.challenge);
    } catch (verifErr: unknown) {
      console.error("Signature validation failure:", verifErr);
      return { success: false, error: "Signature validation failed. Mismatched or tampered data." };
    }

    // Info: (20260412 - Luphia) Mark as secure: append signature
    let setupContent = fs.readFileSync(envSetupPath, "utf-8");
    setupContent = setupContent.replace(/^SUPER_ADMIN_SIGNATURE=.*$/m, "").trim();
    const signatureBlob = Buffer.from(JSON.stringify(authData)).toString('base64');
    setupContent += `\n\n# PART 9: Configuration Immutable Signature via FIDO2\nSUPER_ADMIN_SIGNATURE="${signatureBlob}"`;
    fs.writeFileSync(envSetupPath, setupContent, "utf-8");

    // Info: (20260412 - Luphia) Finalize environment
    const finalizeRes = await finalizeSetupEnvironment();
    if (!finalizeRes.success) return finalizeRes;

    return { success: true };

  } catch (err: unknown) {
    console.error("verifyAndFinalizeConfig fatal error:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function isSystemSetupComplete(): Promise<boolean> {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return false;

    const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
    const envConfig = dotenv.parse(fs.readFileSync(envPath, "utf-8"));

    const pubX = envConfig.SUPER_ADMIN_PUB_X;
    const pubY = envConfig.SUPER_ADMIN_PUB_Y;
    const credId = envConfig.SUPER_ADMIN_CRED_ID;

    // Info: (20260412 - Luphia) Check if signature was added. The env contains quotes, dotenv strips them generally, but let's be careful
    let signatureStr = envConfig.SUPER_ADMIN_SIGNATURE;

    if (!pubX || !pubY || !credId || !signatureStr) {
      return false;
    }

    // Info: (20260412 - Luphia) Replace outer quotes if dotenv missed them
    signatureStr = signatureStr.replace(/^"(.*)"$/, '$1');

    const authData = JSON.parse(Buffer.from(signatureStr, "base64").toString("utf-8"));
    const credentialPublicKey = reconstructKeyFromXY(pubX, pubY);
    const credential = {
      id: credId,
      publicKey: credentialPublicKey,
      algorithm: "ES256" as const,
      transports: [],
    };

    // Info: (20260412 - Luphia) Extact challenge from clientDataJSON to verify the crypto assertion itself
    const clientDataStr = Buffer.from(authData.response.clientDataJSON, "base64url").toString("utf-8");
    const clientData = JSON.parse(clientDataStr);
    const expectedChallenge = clientData.challenge;

    await verifyAuthentication(authData, credential, expectedChallenge);
    return true;
  } catch {
    console.warn("System setup check failed (tampered config or missing verification):");
    return false;
  }
}

export async function saveExternalConfig(config: {
  appUrl: string,
  gaId: string,
  geminiKey: string,
  oenToken: string,
  oenMerchant: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const envSetupPath = path.join(process.cwd(), ".env.setup");
    let content = fs.existsSync(envSetupPath) ? fs.readFileSync(envSetupPath, "utf-8") : "";

    const updateEnv = (key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (content.match(regex)) {
        content = content.replace(regex, () => `${key}=${value}`);
      } else {
        content += `\n${key}=${value}\n`;
      }
    };

    if (!content.includes("# PART 8")) {
      content += "\n\n# PART 8: External API Configuration";
    }

    updateEnv("NEXT_PUBLIC_APP_URL", `"${config.appUrl}"`);
    if (config.gaId) updateEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", `"${config.gaId}"`);
    if (config.geminiKey) updateEnv("GEMINI_API_KEY", `"${config.geminiKey}"`);
    if (config.oenToken) updateEnv("OEN_ACCESS_TOKEN", `"${config.oenToken}"`);
    if (config.oenMerchant) updateEnv("OEN_MERCHANT_ID", `"${config.oenMerchant}"`);

    updateEnv("REPORT_OUTPUT_DIR", `"reports"`);
    updateEnv("MODEL", `"gemini-2.5-pro"`);

    fs.writeFileSync(envSetupPath, content, "utf-8");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getExternalConfig(): Promise<{
  success: boolean;
  data?: {
    appUrl: string;
    gaId: string;
    geminiKey: string;
    oenToken: string;
    oenMerchant: string;
  };
  error?: string;
}> {
  try {
    const envPath = path.join(process.cwd(), ".env");
    const envSetupPath = path.join(process.cwd(), ".env.setup");

    // Info: (20260413 - Luphia) Read from .env.setup first, then .env
    const targetEnv = fs.existsSync(envSetupPath) ? envSetupPath : (fs.existsSync(envPath) ? envPath : null);

    if (targetEnv) {
      const dotenv = await import("dotenv").then(m => (m as unknown as { default?: typeof m }).default || m);
      const config = dotenv.parse(fs.readFileSync(targetEnv, "utf-8"));

      return {
        success: true,
        data: {
          appUrl: config.NEXT_PUBLIC_APP_URL || "https://isunfa.localhost",
          gaId: config.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-ZNVVW7JP0N",
          geminiKey: config.GEMINI_API_KEY || "",
          oenToken: config.OEN_ACCESS_TOKEN || "",
          oenMerchant: config.OEN_MERCHANT_ID || "mermer"
        }
      };
    }

    return { success: false, error: "No config file found" };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
