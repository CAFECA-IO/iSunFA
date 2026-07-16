// Info: (20260714 - Emily) 報告草稿(DB E2EE)與 sessions 標題快取的 Zod Schema
// Info: (20260714 - Emily) 草稿密文入庫,明文驗證發生在前端解密後;壞資料 Fail Fast 直接丟棄

import { z } from "zod";
import { CARBON_REPORT_DRAFT_STORAGE_VERSION } from "@/constants/carbon_chatbot";

const ReportCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  emissions: z.number(),
});

const ReportParagraphSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  code: z.string().min(1),
  title: z.string(),
  content: z.string(),
  isCompleted: z.boolean(),
  isVerified: z.boolean(),
  isDataDriven: z.boolean(),
});

// Info: (20260714 - Emily) IReportData 的結構驗證:前端解密草稿密文後、寫入狀態前的護欄
export const CarbonReportDataSchema = z.object({
  documentName: z.string(),
  title: z.string(),
  section: z.string(),
  categories: z.array(ReportCategorySchema),
  paragraphs: z.array(ReportParagraphSchema).optional(),
  totalEmissions: z.number(),
});

export type CarbonReportDataPayload = z.infer<typeof CarbonReportDataSchema>;

// Info: (20260714 - Emily) PUT /api/v1/chat/carbon/report 請求:server 只驗封裝形狀與大小
// Info: (20260716 - Emily) #52 雙模式:個人會話帶 envelope(E2EE);帳本會話帶 plainContent(模型 A,
// Info: (20260716 - Emily) at-rest 加密由 DB 層承擔)— 恰好擇一,兩者皆有/皆無均拒
export const CarbonReportDraftPutSchema = z
  .object({
    channel: z.string().min(1).max(200),
    // Info: (20260714 - Emily) 樂觀鎖:讀取時的版本;不符即 VL_DRAFT_VERSION_CONFLICT
    version: z.number().int().min(0),
    recipientPublicKey: z.string().min(1).max(300),
    envelope: z
      .object({
        encryptedContent: z.string().min(1).max(2_000_000),
        ephemeralPublicKey: z.string().max(300).optional(),
        keyDerivationHint: z.string().min(1).max(200),
        algorithm: z.string().min(1).max(100),
      })
      .optional(),
    plainContent: z.string().min(1).max(2_000_000).optional(),
  })
  .refine((data) => Boolean(data.envelope) !== Boolean(data.plainContent), {
    message: "exactly one of envelope or plainContent is required",
  });

export type CarbonReportDraftPutPayload = z.infer<
  typeof CarbonReportDraftPutSchema
>;

// Info: (20260714 - Emily) sessions 標題快取(localStorage;標題衍生自密文首訊,server 讀不到,僅本機快取)
export const StoredSessionsIndexSchema = z.object({
  version: z.literal(CARBON_REPORT_DRAFT_STORAGE_VERSION),
  sessions: z
    .array(
      z.object({
        id: z.string().min(1).max(50),
        title: z.string().max(200),
        createdAt: z.string().max(50),
      }),
    )
    .max(100),
});

export type StoredSessionsIndex = z.infer<typeof StoredSessionsIndexSchema>;
