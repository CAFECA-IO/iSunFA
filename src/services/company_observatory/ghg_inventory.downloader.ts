import {
  ESG_METRICS_URL,
  GHG_DECLARE_ITEM_KEYWORD,
  OBSERVATORY_CONTENT_TYPE,
  OBSERVATORY_FETCH_OUTCOME,
  OBSERVATORY_REASON,
  OBSERVATORY_SOURCE,
} from "@/constants/company_observatory";
import {
  IObservatoryDownloader,
  IObservatoryFetchResult,
  IObservatoryHttpClient,
  IObservatoryReportMetadata,
  IObservatoryTarget,
} from "@/interfaces/company_observatory";
import {
  esgMetricsResponseSchema,
  IEsgDeclareItem,
  IEsgMetricsResponse,
} from "@/validators/company_observatory";
import { parseJsonBody } from "@/lib/company_observatory/content";
import { ESG_PLATFORM_HEADERS } from "@/services/company_observatory/esg_report.downloader";

/**
 * Info: (20261015 - Luphia) 碳盤查（溫室氣體盤查）揭露下載器。
 *
 * 上市櫃公司的溫室氣體盤查結果依規定申報於公開資訊觀測站的 ESG 資訊揭露，
 * 證交所 ESG 數位平台以 `mopsEsg/singleCompanyData` 提供：範疇一～三排放量、資料邊界、
 * 確信機構、確信標準、確信意見，以及減量目標與達成情形。
 * 這裡只取項目名稱含「溫室氣體」的揭露項目，決定性地轉為「段落｜欄位：值」的純文字。
 * 數值原樣照抄（含千分位），不換算、不加總——計算一律留給後端的確定性規則引擎。
 */

export function buildGhgRequestBody(stockId: string, year: number): string {
  return JSON.stringify({
    companyCode: stockId,
    yearList: [year],
    companyName: null,
    year,
  });
}

// Info: (20261015 - Luphia) API 是 POST；記錄的 sourceUrl 以 fragment 標出查詢條件，不改變請求語意
export function buildGhgSourceUrl(stockId: string, year: number): string {
  return `${ESG_METRICS_URL}#companyCode=${encodeURIComponent(stockId)}&year=${year}`;
}

export function selectGhgItems(
  response: IEsgMetricsResponse,
  stockId: string,
): IEsgDeclareItem[] {
  const record = (response.data ?? []).find(
    (row) => !row.companyCode || row.companyCode === stockId,
  );
  if (!record) return [];
  return (record.treeModels ?? [])
    .flatMap((tree) => tree.items ?? [])
    .filter((item) =>
      (item.declareItemName ?? "").includes(GHG_DECLARE_ITEM_KEYWORD),
    );
}

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// Info: (20261015 - Luphia) 溫室氣體揭露上的欄位名稱：盤查的第三方查證機構與標準
const GHG_ASSURER_TITLE = "確信機構";
const GHG_ASSURANCE_STANDARD_TITLE = "確信標準";

/**
 * Info: (20261015 - Luphia) 取第一個有填的查證機構與標準（範疇一在最前面），原樣照抄。
 * 盤查依 ISO 14064-3 是「查證」，因此放在查證欄位，而不是報告書的確信欄位。
 */
export function ghgInventoryMetadata(
  items: IEsgDeclareItem[],
): IObservatoryReportMetadata {
  const firstValue = (title: string): string | undefined => {
    for (const item of items) {
      for (const section of item.sections ?? []) {
        for (const control of section.controls ?? []) {
          const value = displayValue(control.value);
          if ((control.title ?? control.showTitle) === title && value !== "") {
            return value;
          }
        }
      }
    }
    return undefined;
  };
  return {
    verificationAgency: firstValue(GHG_ASSURER_TITLE),
    verificationStandards: firstValue(GHG_ASSURANCE_STANDARD_TITLE),
  };
}

export function renderGhgInventoryText(
  items: IEsgDeclareItem[],
  header: string,
): string {
  const lines: string[] = [header];
  for (const item of items) {
    lines.push("", `【${item.declareItemShowName || item.declareItemName}】`);
    for (const section of item.sections ?? []) {
      const sectionName = section.showName || section.name || "";
      for (const control of section.controls ?? []) {
        const value = displayValue(control.value);
        if (value === "") continue;
        const title = control.showTitle || control.title || "";
        lines.push(`${sectionName}｜${title}：${value}`);
      }
      if (section.comment && section.comment.trim()) {
        lines.push(`${sectionName}｜備註：${section.comment.trim()}`);
      }
    }
  }
  return lines.join("\n");
}

export const ghgInventoryDownloader: IObservatoryDownloader = {
  source: OBSERVATORY_SOURCE.GHG_INVENTORY,

  async fetch(
    target: IObservatoryTarget,
    http: IObservatoryHttpClient,
  ): Promise<IObservatoryFetchResult> {
    const res = await http.request(ESG_METRICS_URL, {
      method: "POST",
      headers: ESG_PLATFORM_HEADERS,
      body: buildGhgRequestBody(target.stockId, target.year),
    });
    if (res.status !== 200) {
      throw new Error(`ESG metrics HTTP ${res.status}`);
    }
    const parsed = esgMetricsResponseSchema.parse(parseJsonBody(res.body));
    const items = selectGhgItems(parsed, target.stockId);
    const sourceUrl = buildGhgSourceUrl(target.stockId, target.year);
    if (items.length === 0) {
      return {
        outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
        reason: OBSERVATORY_REASON.NO_GHG_ITEMS,
        sourceUrl,
      };
    }
    const header = `溫室氣體盤查揭露（${target.companyName}，${target.year} 年度，來源：公開資訊觀測站 ESG 資訊揭露）`;
    return {
      outcome: OBSERVATORY_FETCH_OUTCOME.FOUND,
      sourceUrl,
      title: `${target.companyName} ${target.year} 年溫室氣體盤查揭露`,
      contentType: OBSERVATORY_CONTENT_TYPE.TEXT,
      body: Buffer.from(renderGhgInventoryText(items, header), "utf-8"),
      metadata: ghgInventoryMetadata(items),
    };
  },
};
