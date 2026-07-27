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
export const CarbonActivityRecordSchema = z.object({
  scopeCategory: z.nativeEnum(GhgProtocolCategory),
  sourceName: z.string().min(1).max(100),
  quantity: z.string().min(1).max(50),
  unit: z.nativeEnum(MeasurementUnit),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  source: z.string().max(200).optional(),
});

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
      CarbonActivityRecordSchema.extend({
        emissionFactor: z.string().max(50).optional(),
        factorSource: z.string().max(200).optional(),
      }),
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
    CarbonActivityRecordSchema.extend({
      emissionFactor: z.string().max(50).optional(),
      factorSource: z.string().max(200).optional(),
    }),
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
