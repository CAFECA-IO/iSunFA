import {
  ANALYSIS_BASE_COSTS,
  ANALYSIS_PERIOD_MULTIPLIERS,
  AnalysisCategory,
  AnalysisPeriodType,
} from "@/constants/price";

export interface IAnalysisParams {
  category: AnalysisCategory;
  periodType: AnalysisPeriodType;
  periodValue: string;
  year: number;
  country?: string;
  keyword?: string;
  isExternal?: boolean;
}

export interface IDocumentParams {
  category: AnalysisCategory;
  accountBookId: string;
  files: string[];
}

export interface IConsultationParams {
  category: AnalysisCategory;
  question: string;
  files: string[];
}

export interface IOrderParams {
  data: IAnalysisParams | IDocumentParams | IConsultationParams;
  items?: { name: string; unitPrice: number; quantity: number }[];
}

export type AnalysisCostParams = IAnalysisParams | IDocumentParams | IConsultationParams;

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
  const baseCost = ANALYSIS_BASE_COSTS[category] ?? 9999;

  // Info: (20260419 - Luphia) 2. 若傳入的參數包含 periodType (IAnalysisParams)，則乘上時間週期倍率
  if ('periodType' in params && params.periodType) {
    const multiplier = ANALYSIS_PERIOD_MULTIPLIERS[params.periodType] ?? 1;
    return Math.round(baseCost * multiplier);
  }

  // Info: (20260419 - Luphia) 3. 一般文件或諮詢 (無期間設定) 直接回傳基礎價格
  return baseCost;
}
