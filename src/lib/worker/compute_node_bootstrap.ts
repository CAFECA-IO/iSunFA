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

dotenvExpand.expand(dotenv.config({ path: ENV_WORKER_PATH }));

const fileTrustRoots = scrubForbiddenComputeEnv(process.env);
if (fileTrustRoots.length > 0) {
  console.error(
    `${TAG} Removed trust-root keys found in ${ENV_WORKER_PATH}: ${fileTrustRoots.join(", ")}. ` +
      "The worker file must hold only the keys in .env.worker.example — do not copy the system .env into it.",
  );
}

const missing = missingRequiredComputeEnv(process.env);
if (missing.length > 0) {
  console.error(
    `${TAG} ${ENV_WORKER_PATH} leaves required keys empty: ${missing.join(", ")}. ` +
      "An empty value is the same as a missing one — fill them in. Exiting.",
  );
  process.exit(1);
}

console.log(
  `${TAG} Loaded ${ENV_WORKER_PATH}; node role = ${WORKER_NODE_ROLE.COMPUTE}`,
);
