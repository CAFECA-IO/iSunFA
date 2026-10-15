import os from "os";
import crypto, { generateKeyPairSync } from "crypto";
import { dockerService } from "@/services/docker.service";
import { setupRepo } from "@/repositories/setup.repo";
import {
  ROOT_PATH,
  ENV_PATH,
  ENV_SETUP_PATH,
  updateOrAppendEnv,
  getEnvRawContent,
  saveEnvRawContent,
  existsEnv,
} from "@/services/env.service";
import { getDbUrl } from "@/services/setup.db.service";
import { setSuperAdminTaskStatus } from "@/services/setup.state.service";
import { deriveAccountAddress } from "@/lib/auth/account_address";
import { Role } from "@/constants/role";

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
  // Info: (20261015 - Luphia) 區塊鏈退役：不再寫入 RPC / 鏈 ID / 區塊瀏覽器等鏈設定
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

/**
 * Info: (20261015 - Luphia) 管理員帳號位址：與一般 passkey 註冊同一條鏈下推導規則
 * （`deriveAccountAddress`），不再呼叫 SCW_FACTORY.getAddress。
 * setup 精靈建立的帳號一向以全小寫存放（見 webauthn.repo.findUserByAnyAddressForm），維持不變。
 */
function deriveSetupAddress(
  credentialId: string,
  pubKeyX: string,
  pubKeyY: string,
): string {
  return deriveAccountAddress({ credentialId, pubKeyX, pubKeyY }).toLowerCase();
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
    const dbUrl = await getDbUrl();
    let address = deriveSetupAddress(credentialId, pubKeyX, pubKeyY);

    const existingByCred = await setupRepo.findUserByCredentialId(
      dbUrl,
      credentialId,
    );

    if (existingByCred) {
      /**
       * Info: (20261015 - Luphia) 同一把金鑰已有帳號（例如重試）：DB 為準，沿用既有位址，
       * 只確保它是 SUPER_ADMIN。原本這裡會以新算出的位址再 upsert 一列，
       * 而同一個 credentialId 不能有兩列（unique），那條路徑必然失敗。
       */
      address = existingByCred.address;
      if (existingByCred.role !== Role.SUPER_ADMIN) {
        await setupRepo.downgradeAllSuperAdminsToUser(dbUrl);
        await setupRepo.upsertSuperAdminByAddress(dbUrl, {
          address,
          credentialId,
          pubKeyX,
          pubKeyY,
          name: existingByCred.name || name,
        });
      }
    } else {
      const existingByAddr = await setupRepo.findUserByAddress(dbUrl, address);
      if (!existingByAddr) {
        await setupRepo.downgradeAllSuperAdminsToUser(dbUrl);
        await setupRepo.createUser(dbUrl, {
          address,
          pubKeyX,
          pubKeyY,
          credentialId,
          role: Role.SUPER_ADMIN,
          name,
        });
      }
    }

    /**
     * Info: (20261015 - Luphia) 原本這裡會在背景部署 SCW、設定 KYC 等級、授予鏈上管理員角色，
     * 並以 task status 讓前端輪詢進度。區塊鏈退役後建帳在上面就已完成，
     * 狀態直接標為完成；回傳 pendingTask: false，前端不再輪詢。
     */
    await setSuperAdminTaskStatus({
      done: true,
      error: null,
      progress: "Completed",
    });

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

    return { success: true, address, pendingTask: false };
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
    const address = deriveSetupAddress(credentialId, pubKeyX, pubKeyY);

    const dbUrl = await getDbUrl();
    const existing = await setupRepo.findUserByAddress(dbUrl, address);

    if (!existing) {
      await setupRepo.createUser(dbUrl, {
        address,
        pubKeyX,
        pubKeyY,
        credentialId,
        role: Role.ADMIN,
        name,
      });
    } else if (existing.role === Role.USER) {
      await setupRepo.updateUser(dbUrl, address, {
        role: Role.ADMIN,
        name,
      });
    }

    // Info: (20261015 - Luphia) 原本另有部署 SCW 與授予鏈上管理員角色，隨區塊鏈退役移除
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
    // Info: (20261015 - Luphia) 原本另會撤銷鏈上管理員角色，隨區塊鏈退役移除
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
