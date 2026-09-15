import fs from "fs";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import {
  WORKER_NODE_ROLE,
  WORKER_NODE_ROLE_ENV,
} from "@/constants/worker_node";
import {
  missingRequiredComputeEnv,
  scrubForbiddenComputeEnv,
} from "@/lib/worker/node_env";
import { ENV_WORKER_PATH } from "@/services/env.service";

/**
 * Info: (20260914 - Luphia) 外部運算節點的啟動邊界——**副作用模組**，兩個進入點
 *（`scripts/run_compute_node.ts`、`scripts/executor_worker.ts`）以第一個 import 載入。
 *
 * ## 為什麼是「第一個 import」而不是進入點檔內的第一行
 *
 * `package.json` 是 `"type": "module"`：ESM 先依匯入順序求值**整個**靜態圖，
 * 再跑進入點自己的語句。所以寫在進入點檔內的「旗標 → 抹除 → 載 `.env.worker`」
 * 全部發生在服務圖載完之後（review 三輪需修-7；前兩版的註解說的是相反的事，
 * 而 5/21 的 `executor_worker` 從一開始就是同一個誤解）。後果：
 *
 * - 圖裡任何模組層級抓 env 的寫法，在抹除之前就抓走了，後面的 `delete` 是化妝。
 * - 未來若有靜態邊進 `lib/prisma`，載入時旗標還沒設，守門 fail open。
 *
 * 把這三件事放進一個獨立模組、當進入點的第一個 import，ESM 的順序保證就變成
 * 我們要的順序：本模組（與它自己那幾個零 prisma 的依賴）先求值，服務圖在後。
 * `worker_node_boundary.test.ts` 釘住「兩個進入點的第一個執行期匯入是本模組」。
 *
 * ## 做的事（順序有意義）
 *
 * 1. 節點角色旗標：`lib/prisma` 在任何路徑載到它時 fail fast（靜態或動態都算）；
 *    `getPriorityEnvConfig()` 看到它只解析 `.env.worker`，同機部署也不再讀系統 `.env`
 *   （review 三輪阻-3）。
 * 2. 抹掉 shell 繼承的信任根——在載檔**之前**（dotenv 不覆寫既有鍵）。
 * 3. 缺 `.env.worker` 直接退出：warn 後續跑會把付費任務燒成 giveup。
 * 4. 載 `.env.worker`（保留 dotenv-expand：這支原本就支援 `${VAR}` 展開）。
 *    只用 dotenv 一種機制，不再另有一條「解析後逐鍵寫進 `process.env`」的路——
 *    後者會讓檔內的空值蓋掉 pm2／shell 給的值（review 三輪需修-4）。
 * 5. 檔案本身也可能帶信任根（有人把 `.env` 整份複製過來）：載完再抹一次。
 * 6. 必要鍵**值**非空，否則退出（review 三輪需修-4）。
 */
const TAG = "[ComputeNodeBootstrap]";

process.env[WORKER_NODE_ROLE_ENV] = WORKER_NODE_ROLE.COMPUTE;

const inheritedTrustRoots = scrubForbiddenComputeEnv(process.env);
if (inheritedTrustRoots.length > 0) {
  console.error(
    `${TAG} Removed trust-root keys inherited from the shell: ${inheritedTrustRoots.join(", ")}. ` +
      "A compute node must not carry these — fix the deployment environment.",
  );
}

if (!fs.existsSync(ENV_WORKER_PATH)) {
  console.error(
    `${TAG} No configuration at ${ENV_WORKER_PATH}. This node does not fall back to the system .env — ` +
      "copy .env.worker.example and fill it in. Exiting.",
  );
  process.exit(1);
}

/**
 * Info: (20260915 - Luphia) **解析檔案，對解析結果做檢查**（review 四輪阻-1）。
 * 第三版檢查的是合併後的 `process.env`，而消費端（executor 的 `loadWorkerEnvConfig()`、
 * planner 等的 `getPriorityEnvConfig()`）**重新讀檔**、完全不看 `process.env`——
 * 於是 shell 有 `NEXT_PUBLIC_RPC_URL` 的機器上，檔案全空值照樣通過守門，然後每個
 * 消費端拿到空字串。這裡查的是 `dotenv.parse` 的結果：**檔案是唯一真值**，shell
 * 不是來源。保留 `${VAR}` 展開，`processEnv: {}` 讓展開只看檔內鍵。
 */
const workerFile: Record<string, string> =
  dotenvExpand.expand({
    parsed: dotenv.parse(fs.readFileSync(ENV_WORKER_PATH, "utf8")),
    processEnv: {},
  }).parsed ?? {};

const fileTrustRoots = scrubForbiddenComputeEnv(workerFile);
if (fileTrustRoots.length > 0) {
  console.error(
    `${TAG} Removed trust-root keys found in ${ENV_WORKER_PATH}: ${fileTrustRoots.join(", ")}. ` +
      "The worker file must hold only the keys in .env.worker.example — do not copy the system .env into it.",
  );
}

const missing = missingRequiredComputeEnv(workerFile);
if (missing.length > 0) {
  console.error(
    `${TAG} ${ENV_WORKER_PATH} leaves required keys empty: ${missing.join(", ")}. ` +
      "An empty value is the same as a missing one — fill them in. Exiting.",
  );
  process.exit(1);
}

/**
 * Info: (20260915 - Luphia) 檔案值**覆寫** shell 值（review 四輪阻-1 後半）。第三版用
 * `dotenv.config`（不覆寫既有鍵）等於 shell 贏：一個過期的 `MODEL` 或
 * `STORAGE_DOMAIN` 會蓋掉檔案，而讀檔的那半邊用的是檔案值，兩邊不一致且雙方都
 * 不記 log。「不吃系統 env」的意思是 shell 對這些鍵沒有發言權；真的蓋到東西時
 * 記一行 warn，讓部署缺陷現形。ADR 026 P1 會把消費端收成單一 `getComputeNodeConfig()`，
 * 那之後這一步就不需要了。
 */
const overridden = Object.keys(workerFile).filter(
  (key) =>
    process.env[key] !== undefined && process.env[key] !== workerFile[key],
);
Object.entries(workerFile).forEach(([key, value]) => {
  process.env[key] = value;
});
if (overridden.length > 0) {
  console.warn(
    `${TAG} .env.worker overrides shell values for: ${overridden.join(", ")}. ` +
      "The shell is not a configuration source for this node — remove those exports.",
  );
}

console.log(
  `${TAG} Loaded ${Object.keys(workerFile).length} keys from ${ENV_WORKER_PATH}; node role = ${WORKER_NODE_ROLE.COMPUTE}`,
);
