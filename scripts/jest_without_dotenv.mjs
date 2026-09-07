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

import { spawn } from "node:child_process";
import { constants } from "node:os";
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

/**
 * Info: (20260818 - Luphia) 還原一定要跑到，包含被 Ctrl-C 中斷（第五輪低）。
 *
 * 三件事一起才成立：
 *
 * 1. **用非同步的 `spawn`**。`spawnSync` 會把事件迴圈整個佔住，signal handler
 *    在它回來之前根本沒有機會執行——掛了監聽器也沒用。
 * 2. **把信號轉給子行程**再等它結束，而不是自己先走：jest 需要機會收尾，
 *    而且 `.env` 要等它真的不再讀取檔案之後才還原。
 * 3. **`process.on("exit")` 兜底**。`renameSync` 是同步的，因此在 exit 事件裡
 *    仍然跑得完；任何我沒想到的離開路徑都還有這一道。
 *
 * 不做的話，`.env` 會留在被移開的狀態，而**之後每一次執行都是壞的**，
 * 原因又很難猜——那正是這支腳本一開始要避免的事。
 */
let restored = false;
function restoreEnvFile() {
  if (restored) return;
  restored = true;
  if (parked && existsSync(PARKED_FILE)) renameSync(PARKED_FILE, ENV_FILE);
}

process.on("exit", restoreEnvFile);

const child = spawn("npx", ["jest", ...process.argv.slice(2)], {
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

for (const signal of ["SIGINT", "SIGTERM"]) {
  // Info: (20260818 - Luphia) 轉給 jest；還原在下面的 exit handler 統一做
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  restoreEnvFile();
  // Info: (20260818 - Luphia) 被信號結束時照 `128 + signal` 的慣例回報
  process.exit(signal ? 128 + (constants.signals[signal] ?? 0) : (code ?? 1));
});

child.on("error", (error) => {
  restoreEnvFile();
  console.error("[test:no-dotenv] 無法啟動 jest：", error);
  process.exit(1);
});
