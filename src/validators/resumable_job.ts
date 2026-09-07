import { z } from "zod";
import {
  JOB_CLAIM_INTENT,
  JOB_PAUSE_REASON,
  JOB_TYPE,
} from "@/constants/resumable_job";

/**
 * Info: (20260825 - Luphia) 可中斷任務書籤的寫入（issue #6712）。
 *
 * 刻意**不收** `teamId` 與 `nextStepCost`：前者決定這筆消費算誰的，
 * 後者決定掃描行程要不要把任務翻成「可以繼續」——兩個都由伺服器從 channel
 * 與計費設定推導。收呼叫端的值等於讓前端決定自己什麼時候被放行。
 */
export const jobBookmarkPutSchema = z.object({
  type: z.enum([JOB_TYPE.CARBON_REPORT_IMPORT]),
  // Info: (20260825 - Luphia) 綁定的資源；碳盤查是聊天室 channel（同時用來推導付費團隊）
  resourceKey: z.string().min(1).max(200),
  pauseReason: z
    .enum([
      JOB_PAUSE_REASON.CREDITS_EXHAUSTED,
      JOB_PAUSE_REASON.PAYMENT_REQUIRED,
    ])
    .nullable(),
  totalSteps: z.number().int().min(0).max(1000),
  completedSteps: z.number().int().min(0).max(1000),
  failedSteps: z.number().int().min(0).max(1000),
  // Info: (20260825 - Luphia) 只收步驟 id，不收內容（伺服器不持有 E2EE 的明文）
  remainingStepIds: z.array(z.string().min(1).max(100)).max(1000),
  /**
   * Info: (20260825 - Luphia) 下一步的輸入量（位元組）。伺服器據此用**與扣款端
   * 同一支**估算函式算出點數成本——前端算一份的話，兩邊的估算遲早分岔。
   */
  nextStepInputChars: z.number().int().min(0).max(200_000_000).optional(),
  lastError: z.string().max(500).nullable().optional(),
});

export type JobBookmarkPutPayload = z.infer<typeof jobBookmarkPutSchema>;

/**
 * Info: (20260827 - Luphia) 取得執行許可（issue #6721）。
 *
 * 按**資源**而不是按任務 id：客戶端手上只有頻道（那是它自己的聊天室），
 * 任務 id 在伺服器。要它先查一次 id 再換許可，等於在最要緊的路徑上多一個
 * 往返，而那個往返本身又是一個競態窗口。
 *
 * `intent` 收呼叫端的值是安全的：它只影響「找不到任務算不算失敗」，
 * 不影響裁決。真正的裁決（有沒有人正在跑）由伺服器的條件更新決定，
 * 而那一條無論哪種意圖都一樣。
 */
export const jobClaimPostSchema = z.object({
  type: z.enum([JOB_TYPE.CARBON_REPORT_IMPORT]),
  resourceKey: z.string().min(1).max(200),
  intent: z.enum([JOB_CLAIM_INTENT.RESUME, JOB_CLAIM_INTENT.START]),
});

export type JobClaimPostPayload = z.infer<typeof jobClaimPostSchema>;
