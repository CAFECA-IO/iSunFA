import { z } from "zod";

/**
 * Info: (20260807 - Luphia) 費思對話請求驗證（設計書 §5.3）。
 * clientMessageId 供冪等重試：同一則訊息重送不重複扣款。
 *
 * Info: (20260812 - Luphia) accountBookId 取代原本的 teamId（設計書 §5.3「使用前提」）：
 * 費思僅在選定帳本的情境下可用，計費團隊由 server 從 AccountBook.teamId 推導。
 * 計費主體交給 client 自報等於讓瀏覽器選擇由誰付錢，且多團隊用戶無決定論可言。
 * 提供時走計費管線（訂閱額度 → 分配點數）；未提供或未登入走訪客試用（限流）。
 */
export const faithChatSchema = z.object({
  message: z.string().min(1).max(20_000),
  tags: z.array(z.string()).optional().default([]),
  file: z.string().optional(),
  mimeType: z.string().optional(),
  accountBookId: z.string().min(1).optional(),
  clientMessageId: z.string().min(1).max(128).optional(),
});
