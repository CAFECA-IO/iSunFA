// Info: (20260714 - Tzuhan) 報告草稿(DB E2EE)與 sessions 標題快取的 Zod Schema
// Info: (20260714 - Tzuhan) 草稿密文入庫,明文驗證發生在前端解密後;壞資料 Fail Fast 直接丟棄

import { z } from "zod";
import {
  CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS,
  CARBON_REPORT_DRAFT_STORAGE_VERSION,
  ParagraphOriginEnum,
} from "@/constants/carbon_chatbot";
import { CARBON_REPORT_IDENTITY_FIELDS } from "@/lib/utils/carbon_report_identity";
import { PARAGRAPH_FINGERPRINT_MAX_FACTS } from "@/lib/carbon_report_freshness";

const ReportCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  // Info: (20260720 - Tzuhan) #23 改字串化 Decimal;coerce 相容既有草稿的 number(0)不 Fail Fast 丟棄
  emissions: z.coerce.string().max(60),
});

/**
 * Info: (20260908 - Emily) 段落的帳本指紋(#6786)。
 *
 * 選填:這張票之前生成的段落沒有這個欄位,**不得 Fail Fast 丟棄整份報告** ——
 * 那些節的狀態是「不知道」而不是「最新」,由 `assessParagraphFreshness` 判。
 *
 * 筆數上限引 `PARAGRAPH_FINGERPRINT_MAX_FACTS`(= 事實包本身的上限):
 * 指紋是事實包的子集,所以這不是另外猜的數字。手寫第二個數字的話,
 * 分岔的症狀會是「產得出來但存不下來」—— 這份 schema 上禮拜才因為那個形狀
 * 掉過 `reportName` / `identity`(#6788)。
 */
const ParagraphLedgerFingerprintSchema = z.object({
  ledgerComputedAt: z.string().min(1).max(50),
  facts: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        value: z.string().max(200),
      }),
    )
    .max(PARAGRAPH_FINGERPRINT_MAX_FACTS),
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
  // Info: (20260908 - Emily) 帳本指紋(#6786):見上方 ParagraphLedgerFingerprintSchema
  ledgerFingerprint: ParagraphLedgerFingerprintSchema.optional(),
});

/**
 * Info: (20260908 - Emily) 文件中繼資料:報告名稱與四列識別欄位。
 *
 * ## 為什麼補這一段(#6725 的同形第三次)
 *
 * `IReportData` 從 20260812 / 20260814 起就有 `reportName` 與 `identity`
 * (印在 PDF 第一頁的封面資訊:盤查年度、製作單位、查證單位、更新日期),
 * 而這份 schema **沒有** —— 於是:
 *
 *     存:JSON.stringify(reportData)          ← 寫路徑不驗,兩個欄位存得進去
 *     載:CarbonReportDataSchema.safeParse()   ← zod 預設剝掉未宣告的鍵
 *
 * 使用者填的封面資訊在重載之後消失,而**下一次存檔會把剝掉的版本寫回雲端** ——
 * 從此永久消失。畫面上的症狀是四列識別欄位全變「未填寫」、第一頁沒有報告名稱,
 * 而使用者只會覺得「我不是填過了嗎」。實測(9/08):
 * `safeParse` 成功、`parsed.data` 的鍵只剩六個,兩個欄位都不在。
 *
 * 欄位鍵**由常數推導**(`CARBON_REPORT_IDENTITY_FIELDS`),不手寫第二份清單:
 * 那張常數的順序就是列印順序,兩邊分岔的話會是「印得出來但存不下來」的下一個坑。
 *
 * 長度上限:識別欄位是使用者自填的短字串(單位名、日期),`reportName` 是文件標題。
 * 兩者都給明確上限 —— 不設限的字串欄位在 E2EE 草稿裡等於讓單一欄位撐爆整份密文。
 */
const ReportIdentitySchema = z.object(
  Object.fromEntries(
    CARBON_REPORT_IDENTITY_FIELDS.map((field) => [
      field,
      z.string().max(200).optional(),
    ]),
  ) as Record<
    (typeof CARBON_REPORT_IDENTITY_FIELDS)[number],
    z.ZodOptional<z.ZodString>
  >,
);

// Info: (20260714 - Tzuhan) IReportData 的結構驗證:前端解密草稿密文後、寫入狀態前的護欄
export const CarbonReportDataSchema = z.object({
  documentName: z.string(),
  // Info: (20260908 - Emily) 見上方 ReportIdentitySchema 的說明:型別有、schema 沒有 = 載入時被剝掉
  reportName: z.string().max(300).optional(),
  identity: ReportIdentitySchema.optional(),
  title: z.string(),
  section: z.string(),
  categories: z.array(ReportCategorySchema),
  paragraphs: z.array(ReportParagraphSchema).optional(),
  // Info: (20260720 - Tzuhan) #23 改字串化 Decimal;coerce 相容既有草稿的 number
  totalEmissions: z.coerce.string().max(60),
  // Info: (20260716 - Tzuhan) 報告全文權威來源(零改動保證;上限對齊密文欄位)
  // Info: (20260807 - Emily) 上限改引常數:前端預檢與此處必須是同一個數字,否則預檢形同虛設
  rawMarkdown: z.string().max(CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS).optional(),
  // Info: (20260804 - Tzuhan) 匯入來歷(選填以相容既有草稿;不持久化就會隨編輯蒸發)
  importedFrom: z
    .object({
      fileName: z.string().min(1).max(300),
      importedAt: z.string().min(1).max(40),
    })
    .optional(),
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
        encryptedContent: z
          .string()
          .min(1)
          .max(CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS),
        ephemeralPublicKey: z.string().max(300).optional(),
        keyDerivationHint: z.string().min(1).max(200),
        algorithm: z.string().min(1).max(100),
      })
      .optional(),
    plainContent: z
      .string()
      .min(1)
      .max(CARBON_REPORT_DRAFT_MAX_CONTENT_CHARS)
      .optional(),
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
