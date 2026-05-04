import fs from "fs";
import path from "path";
import { parse } from "dotenv";

export const ROOT_PATH = process.cwd();
export const ENV_PATH = path.join(/*turbopackIgnore: true*/ ROOT_PATH, ".env");
export const ENV_SETUP_PATH = path.join(
  /*turbopackIgnore: true*/ ROOT_PATH,
  ".env.setup",
);
export const ENV_EXAMPLE_PATH = path.join(
  /*turbopackIgnore: true*/ ROOT_PATH,
  ".env.example",
);

// Info: (20260414 - Luphia) 更新或附加環境變數，統一處理正則表達式取代邏輯
export function updateOrAppendEnv(
  content: string,
  key: string,
  value: string,
): string {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (content.match(regex)) {
    return content.replace(regex, () => `${key}=${value}`);
  }
  // Info: (20260414 - Luphia) 確保換行符號正確
  const prefix = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  return `${content}${prefix}${key}=${value}\n`;
}

// Info: (20260414 - Luphia) 動態載入並解析指定的 env 檔案
export async function loadEnvConfig(
  targetPath: string,
): Promise<Record<string, string>> {
  if (!fs.existsSync(targetPath)) return {};
  const content = fs.readFileSync(targetPath, "utf8");
  const cleanContent = content
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"))
    .join("\n");
  return parse(cleanContent);
}

// Info: (20260414 - Luphia) 取得優先的環境變數設定 (先讀取 .env.setup，若無則讀取 .env)
export async function getPriorityEnvConfig(): Promise<Record<string, string>> {
  const targetPath = fs.existsSync(ENV_SETUP_PATH)
    ? ENV_SETUP_PATH
    : fs.existsSync(ENV_PATH)
      ? ENV_PATH
      : null;
  if (targetPath) {
    return await loadEnvConfig(targetPath);
  }
  return {} as Record<string, string>;
}

export function getEnvRawContent(targetPath: string): string {
  if (!fs.existsSync(targetPath)) return "";
  return fs.readFileSync(targetPath, "utf8");
}

export function saveEnvRawContent(targetPath: string, content: string): void {
  fs.writeFileSync(targetPath, content, "utf8");
}

export function existsEnv(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}

export function deleteEnv(targetPath: string): void {
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
}

export function computePredictedFinalEnvString(): string {
  const envContent = getEnvRawContent(ENV_PATH);
  const setupContent = existsEnv(ENV_SETUP_PATH)
    ? getEnvRawContent(ENV_SETUP_PATH)
    : "";

  const finalValues: Record<string, string> = {};
  const extractToMap = (content: string) => {
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("#") && trimmed !== "") {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          finalValues[match[1]] = match[2];
        }
      }
    });
  };

  extractToMap(envContent);
  extractToMap(setupContent);

  let finalFileContent = "";
  if (existsEnv(ENV_EXAMPLE_PATH)) {
    const exampleContent = getEnvRawContent(ENV_EXAMPLE_PATH);
    exampleContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") {
        finalFileContent += line + "\n";
      } else {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1];
          if (finalValues[key] !== undefined) {
            finalFileContent += `${key}=${finalValues[key]}\n`;
            delete finalValues[key];
          } else {
            finalFileContent += line + "\n";
          }
        } else {
          finalFileContent += line + "\n";
        }
      }
    });

    const remainingKeys = Object.keys(finalValues);
    if (remainingKeys.length > 0) {
      if (finalValues["SUPER_ADMIN_SIGNATURE"]) {
        finalFileContent +=
          "\n# PART 6: Configuration Immutable Signature via FIDO2\n";
        finalFileContent += `SUPER_ADMIN_SIGNATURE=${finalValues["SUPER_ADMIN_SIGNATURE"]}\n`;
        delete finalValues["SUPER_ADMIN_SIGNATURE"];
      }
      const veryRemaining = Object.keys(finalValues);
      if (veryRemaining.length > 0) {
        finalFileContent += "\n# Auto-Appended Variables\n";
        veryRemaining.forEach((key) => {
          finalFileContent += `${key}=${finalValues[key]}\n`;
        });
      }
    }
  } else {
    finalFileContent = envContent;
    setupContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") {
        if (trimmed !== "" && !finalFileContent.includes(trimmed)) {
          finalFileContent +=
            (finalFileContent.endsWith("\n") || finalFileContent === ""
              ? ""
              : "\n") + `${trimmed}\n`;
        }
      } else {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          finalFileContent = updateOrAppendEnv(
            finalFileContent,
            match[1],
            match[2],
          );
        }
      }
    });
  }
  return finalFileContent.trim() + "\n";
}
