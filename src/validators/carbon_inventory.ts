// Info: (20260716 - Tzuhan) 碳盤查狀態帳本 Zod Schema(#6518)
// Info: (20260716 - Tzuhan) LLM 萃取結果的白名單護欄(enum 鎖死) + E2EE 狀態封裝的形狀驗證

import { z } from "zod";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import {
  EmissionBasisEnum,
  LedgerProvenanceEnum,
} from "@/constants/imported_quantity";
import { MeasurementUnit } from "@/constants/enums";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import { CARBON_CALCULATE_MAX_ACTIVITIES } from "@/constants/carbon_calculation";
import {
  CARBON_ARTICULATION_MAX_STOCK_RECORDS,
  ArticulationStatusEnum,
  ArticulationViolationReasonEnum,
  ArticulationWarningReasonEnum,
} from "@/constants/carbon_articulation";
import { CarbonReportDraftPutSchema } from "@/validators/carbon_report_storage";
import {
  EMISSION_TIMESTAMP_MIN_SECONDS,
  EMISSION_TIMESTAMP_MAX_SECONDS,
} from "@/constants/emission_period";

// Info: (20260716 - Tzuhan) 單筆活動數據: scopeCategory/unit 以 nativeEnum 鎖死；quantity 原樣字串(嚴禁在此轉數字)
/**
 * Info: (20260721 - Tzuhan) 單位護欄(UAT 修正):
 * - 對話/附件萃取的活動:unit 必須是 MeasurementUnit(決定性換算引擎的輸入邊界)
 * - 憑證匯入的活動(esgRecordId + precomputedCo2eKg):排放量直採不重算,
 *   金額基準(spend-based,如 TWD)等非物理單位原樣放行(僅顯示用)
 */
const activityUnitGuard = (
  record: { unit: string; esgRecordId?: string; precomputedCo2eKg?: string },
  ctx: z.RefinementCtx,
) => {
  const isVoucherLinked = Boolean(
    record.esgRecordId && record.precomputedCo2eKg,
  );
  if (
    !isVoucherLinked &&
    !(Object.values(MeasurementUnit) as string[]).includes(record.unit)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["unit"],
      message: "unit must be a MeasurementUnit for non-voucher records",
    });
  }
};

// Info: (20260721 - Tzuhan) shape 供 extend(ZodEffects 不可 extend);對外 schema 一律掛 unit 護欄
const CarbonActivityRecordShape = z.object({
  scopeCategory: z.nativeEnum(GhgProtocolCategory),
  sourceName: z.string().min(1).max(100),
  quantity: z.string().min(1).max(50),
  unit: z.string().min(1).max(50),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  source: z.string().max(200).optional(),
  // Info: (20260720 - Tzuhan) #53 憑證聯動結構化引用(帳本匯入路徑;LLM responseSchema 無此欄位)
  esgRecordId: z.string().max(100).optional(),
  voucherId: z.string().max(100).optional(),
  journalId: z.string().max(100).optional(),
  fileId: z.string().max(100).optional(),
  fileHash: z.string().max(200).optional(),
  precomputedCo2eKg: z.string().max(60).optional(),
  /**
   * Info: (20260806 - Tzuhan) 交易日期(Unix 秒)。**沒有這一行,月別分層只在重載前有效** ——
   * Zod 預設 strip 未宣告的鍵,活動明細解密後過這道 schema 就把時間戳洗掉了,
   * 而畫面上看不出任何異狀:桑基圖只是安靜地退回「未標註期間」一個節點。
   * 上下界與 resolveEmissionMonth 同一組常數(擋毫秒誤傳成秒)。
   */
  tradingTimestamp: z
    .number()
    .int()
    .min(EMISSION_TIMESTAMP_MIN_SECONDS)
    .max(EMISSION_TIMESTAMP_MAX_SECONDS)
    .optional(),
});

export const CarbonActivityRecordSchema =
  CarbonActivityRecordShape.superRefine(activityUnitGuard);

// Info: (20260720 - Tzuhan) #6520 物料庫存紀錄: 質量守恆等式資料;數值原樣字串(解析於 articulation 服務)
export const CarbonStockRecordSchema = z.object({
  materialName: z.string().min(1).max(100),
  openingQuantity: z.string().min(1).max(50),
  purchasedQuantity: z.string().min(1).max(50),
  closingQuantity: z.string().min(1).max(50),
  unit: z.nativeEnum(MeasurementUnit),
  source: z.string().max(200).optional(),
});

// Info: (20260716 - Tzuhan) LLM 萃取輸出: year 為字串原樣，由此決定性轉數字(1990-2100 合理性邊界)
export const CarbonInventoryExtractionSchema = z.object({
  company: z.string().min(1).max(100).optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  boundaryApproach: z
    .enum(["operational_control", "financial_control", "equity_share"])
    .optional(),
  activities: z.array(CarbonActivityRecordSchema).max(20).default([]),
  // Info: (20260720 - Tzuhan) #6520 庫存紀錄萃取(期初/採購/期末;守恆檢核的資料來源)
  stockRecords: z.array(CarbonStockRecordSchema).max(20).optional(),
});

export type CarbonInventoryExtractionPayload = z.infer<
  typeof CarbonInventoryExtractionSchema
>;

// Info: (20260716 - Tzuhan) #6519 計算請求: 活動明細（上限護欄）；計算為決定論，無 LLM
export const CarbonCalculateRequestSchema = z.object({
  activities: z
    .array(
      CarbonActivityRecordShape.extend({
        emissionFactor: z.string().max(50).optional(),
        factorSource: z.string().max(200).optional(),
      }).superRefine(activityUnitGuard),
    )
    .min(1)
    .max(CARBON_CALCULATE_MAX_ACTIVITIES),
  // Info: (20260720 - Tzuhan) #6520 庫存紀錄一併送檢:計算 + 守恆勾稽同一請求(結果掛回 ledger.articulation)
  stockRecords: z
    .array(CarbonStockRecordSchema)
    .max(CARBON_ARTICULATION_MAX_STOCK_RECORDS)
    .optional(),
});
export type CarbonCalculateRequestPayload = z.infer<
  typeof CarbonCalculateRequestSchema
>;

// Info: (20260716 - Tzuhan) #6519 計算總表（前端解密後驗證用；數值皆字串化 Decimal）
const FactorSnapshotSchema = z.object({
  factorId: z.string().max(100),
  name: z.string().max(300),
  value: z.string().max(50),
  unit: z.string().max(50),
  source: z.string().max(300),
});

export const ComputedLedgerSchema = z.object({
  entries: z.array(
    z.object({
      activityKey: z.string().max(300),
      scopeCategory: z.nativeEnum(GhgProtocolCategory),
      sourceName: z.string().max(100),
      quantityRaw: z.string().max(50),
      convertedQuantity: z.string().max(60),
      convertedUnit: z.string().max(50),
      co2eKg: z.string().max(60),
      // Info: (20260806 - Tzuhan) 同上:總表 entry 也要保留時間戳,否則重載後月別分層一樣消失
      tradingTimestamp: z
        .number()
        .int()
        .min(EMISSION_TIMESTAMP_MIN_SECONDS)
        .max(EMISSION_TIMESTAMP_MAX_SECONDS)
        .optional(),
      ghgBreakdown: z.record(z.string(), z.string()).optional(),
      gwpVersion: z.string().max(30).optional(),
      factor: FactorSnapshotSchema,
      /**
       * Info: (20260807 - Emily) 出處必須跟著帳本一起存
       * (issue_drafts/inventory_table_import/16)。
       *
       * 這三個欄位原本在 `IComputedLedgerEntry` 上有,卻不在這個 schema 裡 ——
       * zod 預設剝掉未宣告的鍵,於是存檔那一刻它們就消失了。
       * 重載後 `provenance` 變成 undefined,而型別註解寫著「未給即視為 COMPUTED」,
       * 於是 33 列「原文照錄(表3.8)」全部被改寫成「系統計算」,
       * 活動數據欄還印出從 CO2e 反推的數字 —— 原文根本沒提供過那個值。
       *
       * 數字沒變所以畫面看不出異常,變的是「這筆數字從哪來」的聲明。
       * 對查證文件來說那正是最不能錯的一欄:它決定查核者要向誰索取佐證。
       *
       * 「未給即視為 COMPUTED」這個預設本身是合理的(既有憑證路徑零改動),
       * 但它讓欄位遺失變成**靜默的出處竄改**而不是一個錯誤 ——
       * 所以真正該修的是讓欄位存得下來,而不是改那個預設。
       */
      provenance: z.nativeEnum(LedgerProvenanceEnum).optional(),
      emissionBasis: z.nativeEnum(EmissionBasisEnum).optional(),
      importedOrigin: z
        .object({
          site: z.string().max(200),
          isoCategory: z.nativeEnum(Iso14064Category),
          subCategory: z.string().max(50),
          tableNo: z.string().max(50),
        })
        .optional(),
      // Info: (20260720 - Tzuhan) #53 證據引用(憑證匯入的活動才有)
      evidence: z
        .object({
          esgRecordId: z.string().max(100),
          voucherId: z.string().max(100).optional(),
          journalId: z.string().max(100).optional(),
          fileId: z.string().max(100).optional(),
        })
        .optional(),
    }),
  ),
  pending: z.array(
    z.object({
      activityKey: z.string().max(300),
      sourceName: z.string().max(100),
      reason: z.string().max(50),
    }),
  ),
  scopeSubtotals: z.record(z.string(), z.string()),
  totalCo2eKg: z.string().max(60),
  computedAt: z.string().max(50),
  // Info: (20260720 - Tzuhan) #6520 勾稽結果(等式兩側值透明保存,審計可追溯)
  articulation: z
    .object({
      status: z.nativeEnum(ArticulationStatusEnum),
      violations: z.array(
        z.object({
          materialName: z.string().max(100),
          unit: z.string().max(50),
          reason: z.nativeEnum(ArticulationViolationReasonEnum),
          expectedConsumption: z.string().max(60),
          actualConsumption: z.string().max(60),
          gap: z.string().max(60),
        }),
      ),
      warnings: z.array(
        z.object({
          activityKey: z.string().max(300),
          sourceName: z.string().max(100),
          reason: z.nativeEnum(ArticulationWarningReasonEnum),
          quantity: z.string().max(60),
          plausibleMax: z.string().max(60),
          unit: z.string().max(50),
        }),
      ),
      checkedAt: z.string().max(50),
    })
    .optional(),
});

// Info: (20260716 - Tzuhan) 前端解密後的狀態驗證（壞資料 Fail Fast 丟棄，不入 React 狀態）
export const CarbonInventoryStateSchema = z.object({
  step: z.nativeEnum(CarbonInventoryStep),
  company: z.string().max(100).optional(),
  year: z.number().int().min(1990).max(2100).optional(),
  boundaryApproach: z
    .enum(["operational_control", "financial_control", "equity_share"])
    .optional(),
  activities: z.array(
    CarbonActivityRecordShape.extend({
      emissionFactor: z.string().max(50).optional(),
      factorSource: z.string().max(200).optional(),
    }).superRefine(activityUnitGuard),
  ),
  // Info: (20260720 - Tzuhan) #6520 物料庫存紀錄(隨 state E2EE 保存)
  stockRecords: z.array(CarbonStockRecordSchema).optional(),
  computedLedger: ComputedLedgerSchema.optional(),
  notes: z.array(z.string().max(500)).optional(),
  updatedAt: z.string().max(50),
  version: z.number().int().min(0),
});

// Info: (20260716 - Tzuhan) PUT /inventory 與報告草稿同封裝（密文形狀相同），直接共用 schema 語意化別名
export const CarbonInventoryStatePutSchema = CarbonReportDraftPutSchema;
export type CarbonInventoryStatePutPayload = z.infer<
  typeof CarbonInventoryStatePutSchema
>;

// Info: (20260716 - Tzuhan) #52 帳本會話綁定請求
export const CarbonSessionBindSchema = z.object({
  sessionId: z.string().min(1).max(50),
  accountBookId: z.string().min(1).max(100),
  recipientPublicKey: z.string().min(1).max(300),
});
export type CarbonSessionBindPayload = z.infer<typeof CarbonSessionBindSchema>;

/**
 * Info: (20260730 - Tzuhan) 會話封存/還原請求:只帶 channel。
 * 權限由 resolveCarbonAccess 以 DELETE 層級裁決(個人限擁有者;帳本限擁有者或 OWNER/ADMIN),
 * 故此處不驗擁有權——驗證與授權分層,schema 不承擔授權職責。
 */
export const CarbonSessionArchiveSchema = z.object({
  channel: z.string().min(1).max(200),
});
export type CarbonSessionArchivePayload = z.infer<
  typeof CarbonSessionArchiveSchema
>;

// Info: (20260716 - Tzuhan) #56 報告匯入 LLM 輸出(responseSchema 之外的第二道防線);
// Info: (20260716 - Tzuhan) paragraphId 僅驗型別,白名單複驗於服務層(非法者降入 unmapped 不丟棄)
/**
 * Info: (20260803 - Tzuhan) 單一段落的形狀。獨立匯出是為了讓 Service 能**逐段**裁決。
 *
 * 實測代價:第二章有一段不合形狀,整章的匯入就以 500 收場(LLM output invalid),
 * 該章十幾節的原文全部落空、退回 AI 草稿 —— 一段壞掉賠掉一整章。
 * 這與底下 sourceTables 的註解是同一條原則,我卻只把它套用在表格上,沒套用在段落本身。
 */
export const CarbonReportImportSegmentSchema = z.object({
  paragraphId: z.string().max(50),
  content: z.string().min(1).max(50_000),
  /**
   * Info: (20260801 - Tzuhan) 原文照錄的表格。此處刻意用 unknown 收下再逐張裁決:
   * 一張表格格式不合就整批匯入失敗是不對的比例 —— 其餘段落與敘述都還是好的。
   * 逐張以 CarbonSourceTableSchema 判定,壞的丟掉並記 log(與 activities 同一原則)。
   */
  sourceTables: z.array(z.unknown()).max(20).optional(),
});

export const CarbonReportImportLlmOutputSchema = z.object({
  // Info: (20260803 - Tzuhan) 收下 unknown 再逐段裁決(見 CarbonReportImportSegmentSchema)
  segments: z.array(z.unknown()).max(100),
  unmapped: z.array(z.string().max(50_000)).max(100),
  activities: z.array(z.unknown()).max(50).optional(),
});
export type CarbonReportImportLlmOutput = z.infer<
  typeof CarbonReportImportLlmOutputSchema
>;

/**
 * Info: (20260730 - Tzuhan) 結構圖節點 LLM 輸出。
 * LLM 只回「節點文字 + 父節點文字」,mermaid 語法由 carbon_report_diagram.builder 組出;
 * 節點文字是否真的出現在該段原文,由 builder 的 validateDiagramNodes 複驗(找不到就整張不畫)。
 */
export const CarbonDiagramNodesLlmOutputSchema = z.object({
  nodes: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        parent: z.string().min(1).max(120).optional(),
      }),
    )
    /**
     * Info: (20260730 - Tzuhan) 上限取最寬的模板(沿革時間軸 30)再留餘裕;逐模板的實際上限由 builder 裁決
     *
     * Info: (20260814 - Emily) 60 → 150。這個 schema 不能成為實際的閘門
     * (`data/issue_drafts/open/34_diagram_overflow_clips_nodes.md`)。
     *
     * 2026-08-14 實測：模型回 31 個節點（沿革有 28 條里程碑），第一次被 builder 以
     * `too_many_nodes` 擋下並附上「31 個超過上限 30」的說明 —— 那是對的。
     * 但重試那次回超過 60 個，撞到這裡的 schema，整批 `ZodError` 被拒 → `nodes` 變成空陣列
     * → builder 收到 0 個節點 → 判成 `no_nodes` → 報告上印
     * 「(本節內容不足以繪製結構圖)」。
     *
     * **那句話與事實完全相反**：那一節有 28 條里程碑，是內容太多而不是不足。
     * 而使用者看到的只有這句話。
     *
     * 根因是兩道閘門的職責重疊：schema 想擋「模型跑掉」，builder 想擋「畫不下」，
     * 而 schema 的上限比 builder 的上限只高一倍，於是它會先攔到本該由 builder
     * 說明的情況 —— 然後把「31 個」變成「0 個」，訊息也就跟著錯。
     *
     * 150 讓兩道閘門的角色分開：builder 的逐模板上限（目前最寬 40）永遠先觸發，
     * 說得出「幾個超過幾個」；schema 只留著擋真正的失控輸出（回幾百個節點），
     * 而那時整批拒絕是對的處置。
     */
    .max(150),
});
export type CarbonDiagramNodesLlmOutput = z.infer<
  typeof CarbonDiagramNodesLlmOutputSchema
>;

/**
 * Info: (20260730 - Tzuhan) 頁碼索引 LLM 輸出(兩階段匯入的第一階段)。
 * 只回「每節起始於第幾頁」,輸出極小(33 個數字),用來把第二階段的輸入從整份文件縮成該章對應頁。
 * startPage 僅驗範圍;是否合理由服務層以實際頁數複驗,對不上一律退回送全文(不猜)。
 */
export const CarbonReportPageIndexLlmOutputSchema = z.object({
  index: z
    .array(
      z.object({
        paragraphId: z.string().max(50),
        startPage: z.number().int().min(1).max(5_000),
      }),
    )
    .max(100),
});
export type CarbonReportPageIndexLlmOutput = z.infer<
  typeof CarbonReportPageIndexLlmOutputSchema
>;

// Info: (20260727 - Tzuhan) #57 草稿補齊 LLM 輸出:匯入後仍空白的段落,依上傳文件撰寫草稿(非照抄);
// Info: (20260727 - Tzuhan) paragraphId 僅驗型別,白名單複驗於服務層
export const CarbonReportGapFillLlmOutputSchema = z.object({
  segments: z
    .array(
      z.object({
        paragraphId: z.string().max(50),
        content: z.string().min(1).max(50_000),
      }),
    )
    .max(100),
});
export type CarbonReportGapFillLlmOutput = z.infer<
  typeof CarbonReportGapFillLlmOutputSchema
>;
