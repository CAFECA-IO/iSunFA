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

/**
 * Info: (20260812 - Luphia) worker 節點專屬的設定檔。
 *
 * worker 不使用系統的 `.env`,也不讀資料庫 —— 它有自己的一份。三個理由:
 *
 * 1. **隔離**:`MissionExecutor` 依 `async_workers/00_async_worker_overview.md`
 *    沒有主資料庫權限,那道隔離是防提示詞注入的基礎。讓它與 web 節點共用同一份
 *    `.env`,等於讓它看得到 `DATABASE_URL`、`SECRET_VAULT_MASTER_KEY`、
 *    `SUPER_ADMIN_*` 這些它完全不該擁有的東西 —— 一個處理使用者上傳內容的節點
 *    持有信任根,是把隔離的意義抵銷掉。
 * 2. **最低限度**:worker 只需要它真正用到的鍵（見 `.env.worker.example`）,
 *    而不是整份 web 設定。
 * 3. **可獨立部署**:worker 本來就設計成可以放在另一台機器,那時它不會有
 *    web 節點的 `.env`。給它自己的檔案讓「另一台機器」從特例變成正常情形。
 */
export const ENV_WORKER_PATH = path.join(
  /*turbopackIgnore: true*/ ROOT_PATH,
  ".env.worker",
);

/**
 * Info: (20260811 - Luphia) 值必須是單行，否則寫進去就等於憑空多出一個環境變數鍵。
 *
 * .env 是逐行 `KEY=VALUE` 解析的，這個函式又沒有任何 escaping。值裡帶一個換行，
 * 第二行就會被 parse 成獨立的鍵——包括 SUPER_ADMIN_PUB_X 這種信任根。
 * 這裡 fail fast，不試圖「清乾淨後照寫」：能走到這裡的換行都不是正常輸入。
 */
function assertSingleLineEnvValue(key: string, value: string): void {
  if (/[\r\n]/.test(value)) {
    throw new Error(`Env value for ${key} must not contain line breaks`);
  }
}

// Info: (20260414 - Luphia) 更新或附加環境變數，統一處理正則表達式取代邏輯
export function updateOrAppendEnv(
  content: string,
  key: string,
  value: string,
): string {
  assertSingleLineEnvValue(key, value);
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

/**
 * Info: (20260812 - Luphia) 讀 worker 專屬設定。**不 fallback 到系統 `.env`。**
 *
 * 找不到檔案就回空物件 —— 呼叫端據此給出明確的錯誤,而不是悄悄改用 web 的設定。
 * 「找不到自己的設定就用別人的」正是這條規則要消滅的模糊。
 */
export async function loadWorkerEnvConfig(): Promise<Record<string, string>> {
  if (!fs.existsSync(ENV_WORKER_PATH)) return {};
  return loadEnvConfig(ENV_WORKER_PATH);
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
