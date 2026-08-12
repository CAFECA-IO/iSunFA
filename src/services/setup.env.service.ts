import crypto from "crypto";
import { parse } from "dotenv";
import {
  ENV_PATH,
  ENV_SETUP_PATH,
  updateOrAppendEnv,
  getPriorityEnvConfig,
  getEnvRawContent,
  saveEnvRawContent,
  existsEnv,
  deleteEnv,
  computePredictedFinalEnvString,
} from "@/services/env.service";
import { validateEnvDetailed } from "@/validators/env";
import { systemSettingRepo } from "@/repositories/system_setting.repo";
import { custodialKeyRepo } from "@/repositories/custodial_key.repo";

export async function finalizeSetupEnvironment() {
  if (existsEnv(ENV_SETUP_PATH)) {
    const finalFileContent = computePredictedFinalEnvString();
    saveEnvRawContent(ENV_PATH, finalFileContent);
    deleteEnv(ENV_SETUP_PATH);
    return { success: true };
  }
  return { success: false, error: "Setup file not found." };
}

/**
 * Info: (20260809 - Luphia) 確保 .env 內有可用的保險庫主密鑰。
 *
 * 這把金鑰保護資料庫裡的所有密文（託管錢包私鑰、系統設定的秘密值），
 * 因此必須留在 env。原本只在「初始化資料庫」那一步產生，但資料庫早已初始化過的
 * 部署會跳過該步驟，結果就是完成設定後仍然沒有金鑰——之後在 /admin/settings
 * 儲存任何秘密設定都會失敗。
 *
 * 改由簽章步驟呼叫：寫進 .env.setup 後，接下來計算的 digest 就會涵蓋它，
 * 金鑰因此和其他設定一起被簽署，不會破壞 .env 的完整性簽章。
 * 已有有效值時不覆寫——覆寫等同銷毀既有密文的解密能力。
 */
export async function ensureSecretVaultKey(): Promise<{
  success: boolean;
  generated: boolean;
  error?: string;
}> {
  try {
    const merged = parse(computePredictedFinalEnvString());
    const existing = (merged.SECRET_VAULT_MASTER_KEY || "").replace(
      /^"(.*)"$/,
      "$1",
    );

    // Info: (20260809 - Luphia) 空字串與過短的值一律視為未設定（key_vault 也是這個門檻）
    if (existing.length >= 32) {
      return { success: true, generated: false };
    }

    /**
     * Info: (20260810 - Luphia) 已有密文時絕不換發新金鑰。
     *
     * 主密鑰不見了而資料庫裡還留著用舊金鑰加密的內容，這時發一把新的並不會修好任何事——
     * 舊密文會永久解不開，而系統的反應是「把設定當成不存在」，接著一次全量寫入就把它們刪掉
     * （20260810 的 Google OAuth 設定就是這樣消失的）。
     * 這種狀況必須讓人知道，不能默默繞過。
     */
    const [secretCount, custodialCount] = await Promise.all([
      systemSettingRepo.countSecrets(),
      custodialKeyRepo.count(),
    ]);

    if (secretCount > 0 || custodialCount > 0) {
      return {
        success: false,
        generated: false,
        error: `Refusing to mint a new vault master key: ${secretCount} encrypted setting(s) and ${custodialCount} custodial key(s) already exist and would become permanently unreadable. Restore the original SECRET_VAULT_MASTER_KEY, or clear those records first.`,
      };
    }

    const content = updateOrAppendEnv(
      getEnvRawContent(ENV_SETUP_PATH),
      "SECRET_VAULT_MASTER_KEY",
      `"${crypto.randomBytes(48).toString("base64")}"`,
    );
    saveEnvRawContent(ENV_SETUP_PATH, content);

    return { success: true, generated: true };
  } catch (err: unknown) {
    return {
      success: false,
      generated: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getEnvHashChallenge(): Promise<{
  success: boolean;
  challenge?: string;
  error?: string;
}> {
  try {
    const finalStr = computePredictedFinalEnvString();
    const cleanStr = finalStr
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"))
      .join("\n");
    const config = parse(cleanStr);

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

/**
 * Info: (20260809 - Luphia) 只處理「必須留在 .env」的外部整合設定。
 *
 * Gemini 金鑰、LLM 模型與 OEN 金流憑證已移交 saveSystemSettingDraft（保管於資料庫），
 * 因為它們是會輪替的營運憑證；而這裡剩下的都是 NEXT_PUBLIC_*（build 時內嵌進 client
 * bundle，資料庫的值到不了瀏覽器）或部署路徑，屬於環境差異。
 */
export async function saveExternalConfig(config: {
  appUrl: string;
  gaId: string;
  maptilerKey: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    let content = getEnvRawContent(ENV_SETUP_PATH);

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
    if (config.maptilerKey)
      content = updateOrAppendEnv(
        content,
        "NEXT_PUBLIC_MAPTILER_KEY",
        `"${config.maptilerKey}"`,
      );
    content = updateOrAppendEnv(content, "REPORT_OUTPUT_DIR", `"reports"`);
    content = updateOrAppendEnv(content, "MISSION_DIR", `"missions"`);
    content = updateOrAppendEnv(content, "ISSUE_DIR", `"issues"`);

    saveEnvRawContent(ENV_SETUP_PATH, content);
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
          maptilerKey: config.NEXT_PUBLIC_MAPTILER_KEY || "",
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

export async function copyEnvToSetupAndStripSignature() {
  if (existsEnv(ENV_PATH)) {
    let content = getEnvRawContent(ENV_PATH);
    content = content.replace(
      /\n*# PART 6: Configuration Immutable Signature via FIDO2\nSUPER_ADMIN_SIGNATURE=.*$/gm,
      "",
    );
    content = content.replace(/^SUPER_ADMIN_SIGNATURE=.*$/gm, "");
    content = content.replace(/\n{3,}/g, "\n\n");

    saveEnvRawContent(ENV_SETUP_PATH, content);
  } else if (existsEnv(ENV_SETUP_PATH)) {
    let content = getEnvRawContent(ENV_SETUP_PATH);
    content = content.replace(
      /\n*# PART 6: Configuration Immutable Signature via FIDO2\nSUPER_ADMIN_SIGNATURE=.*$/gm,
      "",
    );
    content = content.replace(/^SUPER_ADMIN_SIGNATURE=.*$/gm, "");
    content = content.replace(/\n{3,}/g, "\n\n");

    saveEnvRawContent(ENV_SETUP_PATH, content);
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
  if (!existsEnv(ENV_PATH) && !existsEnv(ENV_SETUP_PATH))
    return { success: false, error: "No .env file found" };

  const finalStr = computePredictedFinalEnvString();
  const cleanStr = finalStr
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"))
    .join("\n");
  const dotenvConfig = parse(cleanStr);

  const excludeKeys = ["SUPER_ADMIN_SIGNATURE"];
  for (const k of excludeKeys) {
    if (k in dotenvConfig) delete dotenvConfig[k];
  }

  const sortedKeys = Object.keys(dotenvConfig).sort();
  const items = sortedKeys.map((k) => ({ key: k, value: dotenvConfig[k] }));

  return { success: true, items };
}
