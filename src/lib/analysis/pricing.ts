import {
  ANALYSIS_BASE_COSTS,
  ANALYSIS_PERIOD_MULTIPLIERS,
} from "@/constants/price";
import {
  ANALYSIS_CATEGORY,
  AnalysisCategory,
  AnalysisPeriod,
  type MileageAction,
} from "@/constants/analysis";
import { OrderType } from "@/constants/status";

export interface IAnalysisParams {
  category: AnalysisCategory;
  periodType: AnalysisPeriod;
  periodValue: string;
  year: number;
  country?: string;
  keyword?: string;
  isExternal?: boolean;
}

export interface IDocumentParams {
  category: AnalysisCategory;
  accountBookId: string;
  files: { hash: string; name: string }[];
}

export interface IConsultationParams {
  category: AnalysisCategory;
  question: string;
  files: string[];
}

export interface ITransportationParams {
  category: AnalysisCategory;
  origin?: { lat: number | ""; lng: number | "" };
  dest?: { lat: number | ""; lng: number | "" };
  weightKg?: number | "";
  action?: MileageAction;
  text?: string;
  items?: Array<{ origin: string; dest: string }>;
}

export interface IOrderParams {
  type: OrderType;
  data:
    | IAnalysisParams
    | IDocumentParams
    | IConsultationParams
    | ITransportationParams;
  items?: { name: string; unitPrice: number; quantity: number }[];
}

export type AnalysisCostParams =
  | IAnalysisParams
  | IDocumentParams
  | IConsultationParams
  | ITransportationParams;

/**
 * Info: (20260128 - Luphia) Pricing Logic:
 * - Base Cost:
 * - Financial Reports (Balance/Cash/Income): 100
 * - Advanced (Compliance/Health/IRSC): 200
 * - External (Market/Industry/Rating): 500
 * - Multipliers by Period:
 * - Daily: x1
 * - Weekly: x1.5
 * - Monthly: x3
 * - Seasonly: x5
 * - Yearly: x10
 */
export function getAnalysisCost(params: AnalysisCostParams): number {
  // Info: (20260419 - Luphia) 1. 取得對應分類的基礎價格
  const category = params.category;
  const baseCost =
    category === ANALYSIS_CATEGORY.JOURNAL_CORRECTION
      ? ANALYSIS_BASE_COSTS[ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS]
      : (ANALYSIS_BASE_COSTS[category] ?? 0);

  // Info: (20260419 - Luphia) 2. 若傳入的參數包含 periodType (IAnalysisParams)，則乘上時間週期倍率
  if ("periodType" in params && params.periodType) {
    const multiplier = ANALYSIS_PERIOD_MULTIPLIERS[params.periodType] ?? 1;
    return Math.round(baseCost * multiplier);
  }

  // Info: (20260420 - Luphia) 3. 對於憑證分析，若是傳入多個檔案，基礎定價需乘上檔案數量
  if (
    category === ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS &&
    "files" in params &&
    Array.isArray(params.files) &&
    params.files.length > 0
  ) {
    return baseCost * params.files.length;
  }

  // Info: (20260419 - Luphia) 4. 一般文件或諮詢 (無期間設定) 且無多檔乘數時直接回傳基礎價格
  return baseCost;
}
