/**
 * Info: (20260811 - Julian) 以固定時區跑「時區敏感」測試（檔名 `*.tz.test.ts`）。
 *
 * ## 為什麼需要這支
 *
 * `hr_date.ts` 的三個主張裡最重要的一句是「**而且在台灣測不出來**」：
 * `new Date("2026-08-10")` 被當成 UTC 午夜解析，在 UTC 以西的時區取 `getDate()`
 * 會退一天。在 UTC+8 跑測試，這個 bug 完全不會現形。日光節約時間的
 * 23 小時／25 小時日同理 —— 台灣沒有 DST，`differenceInDays` 少算一天的情境
 * 在本地永遠不會發生。
 *
 * 於是這些函式的正確性只在「別人的時區」才驗得出來，而那正是它們會出事的地方。
 *
 * ## 為什麼不在測試檔裡設 process.env.TZ
 *
 * 試過，無效。Node 在 worker 啟動時就解析完時區，`beforeAll` 裡改 `process.env.TZ`
 * 對已建立的 realm 不生效（`Intl.DateTimeFormat().resolvedOptions().timeZone`
 * 仍是原值）。jest 的 `setupFiles` 也一樣太晚。時區必須在**行程啟動前**就定好，
 * 所以只能靠這支 wrapper 設好環境變數再 spawn jest。
 *
 * ## 為什麼不直接把整個測試套件釘在這個時區
 *
 * 那會一次改動另外 82 支測試檔的執行環境，而它們沒有一支被檢查過是否依賴當前時區。
 * 用檔名後綴把範圍收在真正需要的檔案上，其餘測試的行為完全不變。
 *
 * 未來任何時區敏感的測試，只要命名成 `*.tz.test.ts` 就會被這支撿到；
 * `jest.config.mjs` 則把同一組檔案排除在預設執行之外，兩邊不會重跑也不會漏跑。
 */

import { spawnSync } from "node:child_process";

// Info: (20260811 - Julian) 選 America/New_York 而不是隨便一個 UTC 以西時區：它同時滿足兩個條件
// Info: (20260811 - Julian) —— 與 UTC 不同日（UTC-5/-4），且實施日光節約時間（3 月調快、11 月調慢）
const TIMEZONE = "America/New_York";

const result = spawnSync(
  "npx",
  [
    "jest",
    "--testMatch",
    "**/*.tz.test.ts",
    "--testPathIgnorePatterns",
    "/node_modules/",
    "--passWithNoTests",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, TZ: TIMEZONE },
    shell: process.platform === "win32",
  },
);

// Info: (20260811 - Julian) 明確把子行程的結束碼往上帶，否則測試失敗時 npm 會誤判為成功
process.exit(result.status ?? 1);
