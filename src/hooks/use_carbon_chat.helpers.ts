// Info: (20260715 - Luphia) use_carbon_chat 的純函式輔助模組:無 React 狀態相依,獨立可單元測試
// Info: (20260715 - Luphia) 有狀態相依的 useCallback/useEffect 仍留在 hook 本體,避免跨 ref 拆分引入隱性回歸

import { ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

// Info: (20260714 - Emily) 判斷 API 失敗是否為 AI 額度耗盡(IS000011),前端提示稍候重試
export const isQuotaApiError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code;
};

// Info: (20260716 - Emily) 判斷 API 失敗是否為 AI 回應逾時(IS000012),前端提示重試(#6515)
export const isTimeoutApiError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_LLM_TIMEOUT.code;
};

// Info: (20260716 - Emily) 判斷 API 失敗是否為限流(IS000013/HTTP 429),前端提示放慢操作(#6516)
export const isRateLimitedApiError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_RATE_LIMITED.code;
};

// Info: (20260715 - Luphia) 將預覽 Markdown 以 `### ` 標題切分為各段落內文(純字串處理)
// Info: (20260714 - Emily) 僅保留段落區塊(排除文件標頭)、去除組稿附加的 --- 分隔線、並去掉首行標頭只留內文
export const splitReportMarkdownIntoBlocks = (markdown: string): string[] =>
  markdown
    .split(/(?=^### )/m)
    .map((s) => s.replace(/\n+---\s*$/, "").trim())
    .filter((s) => s.startsWith("### "))
    .map((s) => s.replace(/^###[^\n]*\n*/, "").trim());
