import { BUSINESS_MONITOR_INDUSTRY_NAME } from "@/constants/business_monitor";
import { OBSERVATORY_SOURCES_BY_REPORT_TYPE } from "@/constants/company_observatory";
import { IObservatoryVectorFilter } from "@/interfaces/company_observatory";
import { IObservatoryReportPath } from "@/lib/company_observatory/report_projection";

/**
 * Info: (20261015 - Luphia) 企業觀測站頁面（business_monitor.service）讀取觀測站資料時用到的純函數。
 */

// Info: (20261015 - Luphia) 產業篩選鍵 → 名稱；不認得的鍵原樣比對（相容舊網址參數）
export function industryNameOfFilter(industry: string): string {
  return industry in BUSINESS_MONITOR_INDUSTRY_NAME
    ? BUSINESS_MONITOR_INDUSTRY_NAME[
        industry as keyof typeof BUSINESS_MONITOR_INDUSTRY_NAME
      ]
    : industry;
}

/**
 * Info: (20261015 - Luphia) 企業觀測站切塊的過濾條件，與手動匯入報告的寬鬆檢索同一個規則：
 * 有指定公司時只限公司（年度、類型差異交給 LLM 判斷）；沒有公司時才依類型與年度過濾。
 */
export function buildObservatoryFilter(
  hasCompany: boolean,
  matchedPaths: IObservatoryReportPath[],
  reportTypes: string[],
  years: string[],
): IObservatoryVectorFilter {
  if (hasCompany) {
    return {
      stockIds: Array.from(new Set(matchedPaths.map((p) => p.stockId))),
    };
  }
  const sources = Array.from(
    new Set(
      reportTypes.flatMap(
        (type) => OBSERVATORY_SOURCES_BY_REPORT_TYPE[type] ?? [],
      ),
    ),
  );
  return {
    sources: sources.length > 0 ? sources : undefined,
    years: years.length > 0 ? years.map(Number) : undefined,
  };
}
