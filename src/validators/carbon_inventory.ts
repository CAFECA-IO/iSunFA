// Info: (20260716 - Emily) 碳盤查狀態帳本 Zod Schema(#6518)
// Info: (20260716 - Emily) LLM 萃取結果的白名單護欄(enum 鎖死) + E2EE 狀態封裝的形狀驗證

import { z } from "zod";
import { GhgProtocolCategory } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import { CarbonReportDraftPutSchema } from "@/validators/carbon_report_storage";

// Info: (20260716 - Emily) 單筆活動數據:scopeCategory/unit 以 nativeEnum 鎖死;quantity 原樣字串(嚴禁在此轉數字)
export const CarbonActivityRecordSchema = z.object({
  scopeCategory: z.nativeEnum(GhgProtocolCategory),
  sourceName: z.string().min(1).max(100),
  quantity: z.string().min(1).max(50),
  unit: z.nativeEnum(MeasurementUnit),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  source: z.string().max(200).optional(),
});

// Info: (20260716 - Emily) LLM 萃取輸出:year 為字串原樣,由此決定性轉數字(1990-2100 合理性邊界)
export const CarbonInventoryExtractionSchema = z.object({
  company: z.string().min(1).max(100).optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  boundaryApproach: z
    .enum(["operational_control", "financial_control", "equity_share"])
    .optional(),
  activities: z.array(CarbonActivityRecordSchema).max(20).default([]),
});

export type CarbonInventoryExtractionPayload = z.infer<
  typeof CarbonInventoryExtractionSchema
>;

// Info: (20260716 - Emily) 前端解密後的狀態驗證(壞資料 Fail Fast 丟棄,不入 React 狀態)
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
  notes: z.array(z.string().max(500)).optional(),
  updatedAt: z.string().max(50),
  version: z.number().int().min(0),
});

// Info: (20260716 - Emily) PUT /inventory 與報告草稿同封裝(密文形狀相同),直接共用 schema 語意化別名
export const CarbonInventoryStatePutSchema = CarbonReportDraftPutSchema;
export type CarbonInventoryStatePutPayload = z.infer<
  typeof CarbonInventoryStatePutSchema
>;
