/**
 * Info: (20260818 - Luphia) 在「沒有 `.env`」的條件下跑一次完整測試（PR #6652 第四輪）。
 *
 * ## 為什麼需要這支
 *
 * CI 的容器裡**沒有 `.env`**：`test.yaml` 只給了 `DATABASE_URL` 與少數幾個
 * secret。而本機幾乎每個人都有一份完整的 `.env`，於是「測試自己忘了準備前提」
 * 這種缺陷在本機是綠的、在 CI 才紅。
 *
 * 這個形狀在同一個 PR 裡發生過兩次：
 *
 * 1. `key_vault_aad.test.ts` 設的是 `VAULT_MASTER_KEY`，而程式讀
 *    `SECRET_VAULT_MASTER_KEY`——本機綠，因為 `.env` 裡有真的那一個。
 * 2. 修好上面那條的**同一輪**，`faith_memory_aad_backfill.e2e.test.ts` 又忘了
 *    自備主密鑰，推上去之後 CI 紅了。
 *
 * 兩次都不是「想不到」，是「本機測不出來」。所以把它變成一個可以在**推送前**
 * 執行的指令，而不是一條要記得的規則。
 *
 * ## 為什麼要一支 script 而不是一行指令
 *
 * dotenv 認的是「工作目錄下有沒有 `.env` 這個檔案」，光靠環境變數蓋不掉它，
 * 因此必須把檔案暫時移開。手寫成一行的話，測試失敗或按下 Ctrl-C 就可能
 * 把 `.env` 留在移開的狀態——那會讓接下來每一次執行都是壞的，而且原因很難猜。
 * 這支用 `finally` 保證還原。
 *
 * 執行方式：
 *   npm run test:no-dotenv
 *
 * 需要 `DATABASE_URL`（e2e 會用）：這支會先從 `.env` 讀出它再以環境變數傳給
 * 子行程，形狀與 CI 完全一致——env 有值、檔案不存在。
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";

const ENV_FILE = join(process.cwd(), ".env");
const PARKED_FILE = join(process.cwd(), ".env.no-dotenv-run");

/**
 * Info: (20260818 - Luphia) 只取 `DATABASE_URL`：CI 也只給這一個與資料庫有關的值。
 * 其餘一律不帶——那正是這支要暴露的條件。
 */
function readDatabaseUrl() {
  if (!existsSync(ENV_FILE)) return process.env.DATABASE_URL;
  const line = readFileSync(ENV_FILE, "utf8")
    .split("\n")
    .find((row) => row.startsWith("DATABASE_URL="));
  if (!line) return process.env.DATABASE_URL;
  return line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
}

const databaseUrl = readDatabaseUrl();
if (!databaseUrl) {
  console.error(
    "[test:no-dotenv] 找不到 DATABASE_URL（.env 與環境變數都沒有）；e2e 會失敗，先設好再跑。",
  );
  process.exit(1);
}

const parked = existsSync(ENV_FILE);
if (parked) renameSync(ENV_FILE, PARKED_FILE);

try {
  const result = spawnSync("npx", ["jest", ...process.argv.slice(2)], {
    stdio: "inherit",
    /**
     * Info: (20260818 - Luphia) 刻意用**乾淨**的環境加上單一變數，而不是
     * `{ ...process.env }`：本機 shell 裡可能已經 export 過某些值
     * （例如上一次 `source .env`），那會讓這支測不出它要測的東西。
     */
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: process.env.NODE_ENV ?? "test",
      DATABASE_URL: databaseUrl,
    },
    shell: process.platform === "win32",
  });
  process.exitCode = result.status ?? 1;
} finally {
  // Info: (20260818 - Luphia) 無論成功、失敗或中斷都要還原，否則後續每次執行都是壞的
  if (parked && existsSync(PARKED_FILE)) renameSync(PARKED_FILE, ENV_FILE);
}
