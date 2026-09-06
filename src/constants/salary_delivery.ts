/**
 * Info: (20260904 - Julian) 薪資單寄送的狀態與界限值。
 *
 * 放在 `constants` 而不是 service 旁邊：repo、service、route 與測試都要用到它，
 * 而這個檔案不 import 任何 repository —— 測試匯入它不會順帶拖起 Prisma
 * （同 `salary_access.ts` 的理由）。
 */

/**
 * Info: (20260904 - Julian) 只有兩個終局，**沒有 `PENDING`**。
 *
 * 本次是同步寄送：API 等 SMTP 回來才回應，不進佇列。加一個 `PENDING`
 * 只會製造一種「永遠停在 PENDING 而沒有人去收」的狀態 —— 那需要一支 reaper，
 * 而我們還沒有需要它的量（計畫書 §2.2）。改成非同步時再擴充這裡。
 */
export const SALARY_DELIVERY_STATUS = {
  SENT: "SENT",
  FAILED: "FAILED",
} as const;

export type SalaryDeliveryStatus =
  (typeof SALARY_DELIVERY_STATUS)[keyof typeof SALARY_DELIVERY_STATUS];

/**
 * Info: (20260904 - Julian) 失敗原因的截斷長度。
 *
 * 這一欄的內容來自 SMTP 伺服器或 Chrome 的錯誤訊息 —— 長度不由我們決定，
 * 而它們偶爾會回傳整段 stack 或一大塊 HTML。不截斷的話，
 * 一次 SMTP 故障就能在資料庫裡塞進數十 KB 的字串。
 *
 * 500 字容得下任何有診斷價值的開頭（錯誤類別與第一行訊息），
 * 而更後面的內容在這個欄位裡本來就沒有讀者 —— 詳細的在 log。
 */
export const SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH = 500;

/**
 * Info: (20260904 - Julian) 截斷失敗原因。**在寫入那一側截，不是在讀取時截**
 * —— 讀取時截的話那些位元組已經進了資料庫，而它們正是我們不想留著的東西。
 *
 * 放在這裡而不是 repo 裡：它是一個有判準的純函式（空字串與 null 都要變成 null，
 * 不是空字串），而留在 repo 裡要驗它就得連 Prisma 一起拖起來。
 */
export const truncateFailureReason = (
  reason: string | null | undefined,
): string | null => {
  if (reason === null || reason === undefined || reason === "") return null;
  return reason.slice(0, SALARY_DELIVERY_FAILURE_REASON_MAX_LENGTH);
};

/**
 * Info: (20260904 - Julian) 「已寄出」分頁一次取幾列。
 *
 * 上限由伺服器決定，不是由查詢字串決定：`?limit=999999` 會讓一本累積了
 * 幾年寄送紀錄的帳本在一次請求裡把整張表撈出來。
 * 200 遠大於任何一本帳一個月的寄送量，而它擋得住「把整張表當成一次查詢」。
 */
export const SALARY_DELIVERY_LIST_DEFAULT_LIMIT = 50;
export const SALARY_DELIVERY_LIST_MAX_LIMIT = 200;
