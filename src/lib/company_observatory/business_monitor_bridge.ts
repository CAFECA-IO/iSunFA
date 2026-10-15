import { BUSINESS_MONITOR_INDUSTRY_NAME } from "@/constants/business_monitor";
import {
  OBSERVATORY_SNAPSHOT_SOURCES,
  OBSERVATORY_SOURCES_BY_REPORT_TYPE,
} from "@/constants/company_observatory";
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
 * Info: (20261015 - Luphia) 企業觀測站切塊的過濾條件。
 *
 * 有指定公司時限公司；問題問到的年度若這些公司確實有該年度的報告，再加上年度過濾
 * （公司登記這類快照不受年度限制，見 OBSERVATORY_SNAPSHOT_SOURCES）。同一家公司兩個年度的
 * 永續報告書內容高度相似，不限年度時前幾名常被另一年度的切塊佔走。問到的年度一份報告都沒有時
 * 不過濾年度，沿用寬鬆檢索、由 LLM 依中繼資料的年度提醒作答，免得整個檢索落空。
 * 沒有公司時依類型與年度過濾。
 */
export function buildObservatoryFilter(
  hasCompany: boolean,
  matchedPaths: IObservatoryReportPath[],
  reportTypes: string[],
  years: string[],
): IObservatoryVectorFilter {
  if (hasCompany) {
    const availableYears = new Set(
      matchedPaths
        .filter((p) => !OBSERVATORY_SNAPSHOT_SOURCES.includes(p.source))
        .map((p) => p.year),
    );
    const requestedYears = Array.from(new Set(years.map(Number))).filter(
      (year) => availableYears.has(year),
    );
    return {
      stockIds: Array.from(new Set(matchedPaths.map((p) => p.stockId))),
      years: requestedYears.length > 0 ? requestedYears : undefined,
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

// Info: (20260702 - Julian) 偵測年份：抓取 19xx、20xx 四位數（20261015 - Luphia 由 business_monitor.service 移來）
export function detectQuestionYears(question: string): string[] {
  return question.match(/\b(19\d{2}|20\d{2})\b/g) ?? [];
}
