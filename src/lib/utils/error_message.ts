// Info: (20260730 - Tzuhan) 錯誤描述工具
// Info: (20260730 - Tzuhan) 動機:專案多處以 `JSON.stringify(error)` 記錄錯誤,但 Error 的 message/stack 都是
// Info: (20260730 - Tzuhan) 不可列舉屬性,JSON.stringify 對 Error 實例一律得到 "{}"。實測匯入失敗時 log 只印出
// Info: (20260730 - Tzuhan) `LLM call failed: {}`,完全無法判斷是 429 額度、逾時、安全阻擋還是伺服器錯誤——
// Info: (20260730 - Tzuhan) 診斷成本因此全部轉嫁到人身上。錯誤訊息不可觀測,等於沒有錯誤處理。

interface IFetchLikeError {
  status?: unknown;
  statusText?: unknown;
  errorDetails?: unknown;
}

/**
 * Info: (20260730 - Tzuhan) 把任意 unknown 錯誤轉成可讀的一行字。
 * Error → `Name: message`,並附上 HTTP 狀態與伺服器細節(Gemini SDK 的 GoogleGenerativeAIFetchError
 * 帶 status/statusText/errorDetails,這三項正是分辨額度耗盡與伺服器錯誤的關鍵)。
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const parts = [`${error.name}: ${error.message}`];
    const fetchLike = error as unknown as IFetchLikeError;
    if (fetchLike.status !== undefined) {
      parts.push(`status=${String(fetchLike.status)}`);
    }
    if (fetchLike.statusText !== undefined) {
      parts.push(`statusText=${String(fetchLike.statusText)}`);
    }
    if (fetchLike.errorDetails !== undefined) {
      parts.push(`details=${safeStringify(fetchLike.errorDetails)}`);
    }
    if (error.cause !== undefined) {
      parts.push(`cause=${describeError(error.cause)}`);
    }
    return parts.join(" | ");
  }
  if (typeof error === "string") return error;
  return safeStringify(error);
}

// Info: (20260730 - Tzuhan) 循環參照的物件會讓 JSON.stringify 拋錯;記 log 的工具本身不可成為新的失敗點
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
