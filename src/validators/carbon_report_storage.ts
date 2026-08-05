// Info: (20260714 - Tzuhan) 報告草稿(DB E2EE)與 sessions 標題快取的 Zod Schema
// Info: (20260714 - Tzuhan) 草稿密文入庫,明文驗證發生在前端解密後;壞資料 Fail Fast 直接丟棄

import { z } from "zod";
import {
  CARBON_REPORT_DRAFT_STORAGE_VERSION,
  ParagraphOriginEnum,
} from "@/constants/carbon_chatbot";

const ReportCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  // Info: (20260720 - Tzuhan) #23 改字串化 Decimal;coerce 相容既有草稿的 number(0)不 Fail Fast 丟棄
  emissions: z.coerce.string().max(60),
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
  // Info: (20260730 - Tzuhan) 內容來源:選填,舊草稿無此欄不得 Fail Fast 丟棄整份報告
  origin: z.nativeEnum(ParagraphOriginEnum).optional(),
});

// Info: (20260714 - Tzuhan) IReportData 的結構驗證:前端解密草稿密文後、寫入狀態前的護欄
export const CarbonReportDataSchema = z.object({
  documentName: z.string(),
  title: z.string(),
  section: z.string(),
  categories: z.array(ReportCategorySchema),
  paragraphs: z.array(ReportParagraphSchema).optional(),
  // Info: (20260720 - Tzuhan) #23 改字串化 Decimal;coerce 相容既有草稿的 number
  totalEmissions: z.coerce.string().max(60),
  // Info: (20260716 - Tzuhan) 報告全文權威來源(零改動保證;上限對齊密文欄位)
  rawMarkdown: z.string().max(2_000_000).optional(),
});

export type CarbonReportDataPayload = z.infer<typeof CarbonReportDataSchema>;

// Info: (20260714 - Tzuhan) PUT /api/v1/chat/carbon/report 請求:server 只驗封裝形狀與大小
// Info: (20260716 - Tzuhan) #52 雙模式:個人會話帶 envelope(E2EE);帳本會話帶 plainContent(模型 A,
// Info: (20260716 - Tzuhan) at-rest 加密由 DB 層承擔)— 恰好擇一,兩者皆有/皆無均拒
export const CarbonReportDraftPutSchema = z
  .object({
    channel: z.string().min(1).max(200),
    // Info: (20260714 - Tzuhan) 樂觀鎖:讀取時的版本;不符即 VL_DRAFT_VERSION_CONFLICT
    version: z.number().int().min(0),
    /**
     * Info: (20260803 - Tzuhan) ECIES 收件公鑰。**明文模式(plainContent)下為選填** ——
     * 明文模式沒有加密,這個欄位在那裡是空轉的。
     *
     * 原本一律必填,造成「帳本會話免金鑰」只實現了一半:還原免金鑰,保存卻仍要 master,
     * 於是未解鎖時讀得到卻存不了,重載後匯入的帳本與桑基圖消失(見
     * issue_drafts/inventory_table_import/04)。
     *
     * 資料庫該欄位仍為 non-null:明文模式由 API 層以已驗證的使用者位址補上
     * (該位址本來就是授權依據 —— resolveCarbonAccess 以 channel 前綴與 TeamRole 裁決,
     * 不看這個欄位)。因此不需要改 schema、不動索引。
     */
    recipientPublicKey: z.string().min(1).max(300).optional(),
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
  })
  /**
   * Info: (20260803 - Tzuhan) 加密模式仍必須帶公鑰 —— 沒有收件公鑰就無從解密,
   * 存進去的密文等於永久失聯。放寬只針對明文模式。
   */
  .refine((data) => !data.envelope || Boolean(data.recipientPublicKey), {
    message: "recipientPublicKey is required when envelope is present",
  });

export type CarbonReportDraftPutPayload = z.infer<
  typeof CarbonReportDraftPutSchema
>;

// Info: (20260714 - Tzuhan) sessions 標題快取(localStorage;標題衍生自密文首訊,server 讀不到,僅本機快取)
export const StoredSessionsIndexSchema = z.object({
  version: z.literal(CARBON_REPORT_DRAFT_STORAGE_VERSION),
  sessions: z
    .array(
      z.object({
        id: z.string().min(1).max(50),
        title: z.string().max(200),
        createdAt: z.string().max(50),
        // Info: (20260716 - Tzuhan) 使用者自訂標題旗標(重整後首訊衍生不得覆蓋)
        isTitleCustom: z.boolean().optional(),
      }),
    )
    .max(100),
});

export type StoredSessionsIndex = z.infer<typeof StoredSessionsIndexSchema>;
