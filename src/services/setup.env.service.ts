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

export async function finalizeSetupEnvironment() {
  if (existsEnv(ENV_SETUP_PATH)) {
    const finalFileContent = computePredictedFinalEnvString();
    saveEnvRawContent(ENV_PATH, finalFileContent);
    deleteEnv(ENV_SETUP_PATH);
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

export async function saveExternalConfig(config: {
  appUrl: string;
  gaId: string;
  geminiKey: string;
  maptilerKey: string;
  oenToken: string;
  oenMerchant: string;
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
    if (config.geminiKey)
      content = updateOrAppendEnv(
        content,
        "GEMINI_API_KEY",
        `"${config.geminiKey}"`,
      );
    if (config.maptilerKey)
      content = updateOrAppendEnv(
        content,
        "NEXT_PUBLIC_MAPTILER_KEY",
        `"${config.maptilerKey}"`,
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
    content = updateOrAppendEnv(content, "MISSION_DIR", `"missions"`);
    content = updateOrAppendEnv(content, "ISSUE_DIR", `"issues"`);
    content = updateOrAppendEnv(content, "MODEL", `"gemini-2.5-pro"`);

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
          geminiKey: config.GEMINI_API_KEY || "",
          maptilerKey: config.NEXT_PUBLIC_MAPTILER_KEY || "",
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
