import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { dockerService } from "@/services/docker.service";
import { runCommand } from "@/services/cli.service";
import {
  ROOT_PATH,
  ENV_PATH,
  ENV_SETUP_PATH,
  updateOrAppendEnv,
  loadEnvConfig,
  getPriorityEnvConfig,
  getEnvRawContent,
  saveEnvRawContent,
} from "@/services/env.service";

export async function getDbUrl() {
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
    let setupContent = getEnvRawContent(ENV_SETUP_PATH);
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

    /**
     * Info: (20260809 - Luphia) 一併產生保險庫主密鑰。
     * 它保護 DB 內的密文（託管錢包私鑰、系統設定秘密值），因此必須留在 env；
     * 已存在時絕不覆寫——覆寫等同銷毀既有密文的解密能力。
     */
    const existingVaultKey = (await loadEnvConfig(ENV_SETUP_PATH))
      .SECRET_VAULT_MASTER_KEY;
    if (!existingVaultKey) {
      setupContent = updateOrAppendEnv(
        setupContent,
        "SECRET_VAULT_MASTER_KEY",
        `"${randomBytes(48).toString("base64")}"`,
      );
    }

    saveEnvRawContent(ENV_SETUP_PATH, setupContent);
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
    } catch (err) {
      console.warn("Invalid DB URL", err);
    }

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
    let envContent = getEnvRawContent(ENV_PATH);

    envContent = updateOrAppendEnv(
      envContent,
      "POSTGRES_PASSWORD",
      `"${newPassword}"`,
    );
    const encodedPassword = encodeURIComponent(newPassword);
    const dbUrl = `postgresql://isunfa:${encodedPassword}@127.0.0.1:20021/isunfa?schema=public`;
    envContent = updateOrAppendEnv(envContent, "DATABASE_URL", `"${dbUrl}"`);

    saveEnvRawContent(ENV_PATH, envContent);
    return await initDb();
  } catch (e) {
    return { success: false, output: String(e) };
  }
}
