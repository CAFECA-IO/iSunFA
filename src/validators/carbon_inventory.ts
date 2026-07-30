// Info: (20260716 - Tzuhan) 碳盤查狀態帳本 Zod Schema(#6518)
// Info: (20260716 - Tzuhan) LLM 萃取結果的白名單護欄(enum 鎖死) + E2EE 狀態封裝的形狀驗證

import { z } from "zod";
import { GhgProtocolCategory } from "@/constants/esg";
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
      ghgBreakdown: z.record(z.string(), z.string()).optional(),
      gwpVersion: z.string().max(30).optional(),
      factor: FactorSnapshotSchema,
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

// Info: (20260716 - Tzuhan) #56 報告匯入 LLM 輸出(responseSchema 之外的第二道防線);
// Info: (20260716 - Tzuhan) paragraphId 僅驗型別,白名單複驗於服務層(非法者降入 unmapped 不丟棄)
export const CarbonReportImportLlmOutputSchema = z.object({
  segments: z
    .array(
      z.object({
        paragraphId: z.string().max(50),
        content: z.string().min(1).max(50_000),
      }),
    )
    .max(100),
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
    // Info: (20260730 - Tzuhan) 上限取最寬的模板(沿革時間軸 30)再留餘裕;逐模板的實際上限由 builder 裁決
    .max(60),
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
