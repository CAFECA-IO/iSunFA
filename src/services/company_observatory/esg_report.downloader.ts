import {
  ESG_EMPTY_FILE_ID,
  ESG_MARKET_TYPE_CODE,
  ESG_PLATFORM_ORIGIN,
  ESG_REPORT_FILE_URL,
  ESG_REPORT_LIST_URL,
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
  esgReportListResponseSchema,
  IEsgReportListResponse,
} from "@/validators/company_observatory";
import { isPdfBuffer, parseJsonBody } from "@/lib/company_observatory/content";

/**
 * Info: (20261015 - Luphia) 永續報告書下載器（證交所 ESG 數位平台）。
 *
 * 查詢 API 回傳該公司該年度的申報紀錄；檔案 id 以「修正版」優先，沒有才用「首次上傳版」。
 * 兩者皆為全零 UUID 代表只登錄了公司網站連結而沒有上傳檔案——此時視為查無（不去抓任意外部網站）。
 */

export const ESG_PLATFORM_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
  Origin: ESG_PLATFORM_ORIGIN,
  Referer: `${ESG_PLATFORM_ORIGIN}/`,
};

export function buildEsgReportListBody(
  stockId: string,
  marketTypeCode: number,
  year: number,
): string {
  return JSON.stringify({
    marketType: marketTypeCode,
    year,
    companyCodeList: [stockId],
    industryNameList: [],
    industryName: "all",
    companyCode: stockId,
  });
}

function usableFileId(id: string | null | undefined): string | null {
  return id && id !== ESG_EMPTY_FILE_ID ? id : null;
}

type IEsgReportRecord = NonNullable<IEsgReportListResponse["data"]>[number];

export function selectEsgReportRecord(
  response: IEsgReportListResponse,
  stockId: string,
): IEsgReportRecord | null {
  return (response.data ?? []).find((row) => row.code === stockId) ?? null;
}

export function selectEsgReportFileId(
  record: IEsgReportRecord | null,
): string | null {
  if (!record) return null;
  return (
    usableFileId(record.twEditReportDownloadId) ??
    usableFileId(record.twFirstReportDownloadId)
  );
}

// Info: (20261015 - Luphia) 申報紀錄上的揭露期間與確信／保證機構、標準，原樣照抄
export function esgReportMetadata(
  record: IEsgReportRecord | null,
): IObservatoryReportMetadata {
  const pick = (value: string | null | undefined) =>
    value && value.trim() ? value.trim() : undefined;
  return {
    period: pick(record?.reportingInterval),
    assuranceAgency: pick(record?.valiProvider),
    assuranceStandards: pick(record?.thirdStd),
  };
}

export function buildEsgReportFileUrl(fileId: string): string {
  return `${ESG_REPORT_FILE_URL}?id=${encodeURIComponent(fileId)}`;
}

export const esgReportDownloader: IObservatoryDownloader = {
  source: OBSERVATORY_SOURCE.ESG_REPORT,

  async fetch(
    target: IObservatoryTarget,
    http: IObservatoryHttpClient,
  ): Promise<IObservatoryFetchResult> {
    const marketTypeCode = ESG_MARKET_TYPE_CODE[target.marketType];
    if (marketTypeCode === undefined) {
      return {
        outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
        reason: OBSERVATORY_REASON.UNSUPPORTED_MARKET,
        sourceUrl: null,
      };
    }
    const listRes = await http.request(ESG_REPORT_LIST_URL, {
      method: "POST",
      headers: ESG_PLATFORM_HEADERS,
      body: buildEsgReportListBody(target.stockId, marketTypeCode, target.year),
    });
    if (listRes.status !== 200) {
      throw new Error(`ESG report list HTTP ${listRes.status}`);
    }
    const list = esgReportListResponseSchema.parse(parseJsonBody(listRes.body));
    const record = selectEsgReportRecord(list, target.stockId);
    const fileId = selectEsgReportFileId(record);
    if (!fileId) {
      return {
        outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
        reason: OBSERVATORY_REASON.NO_FILE,
        sourceUrl: ESG_REPORT_LIST_URL,
      };
    }

    const sourceUrl = buildEsgReportFileUrl(fileId);
    const fileRes = await http.request(sourceUrl, {
      headers: {
        Origin: ESG_PLATFORM_ORIGIN,
        Referer: `${ESG_PLATFORM_ORIGIN}/`,
      },
    });
    if (fileRes.status !== 200) {
      throw new Error(`ESG report file HTTP ${fileRes.status}`);
    }
    if (!isPdfBuffer(fileRes.body)) {
      throw new Error("ESG report file is not a PDF");
    }
    return {
      outcome: OBSERVATORY_FETCH_OUTCOME.FOUND,
      sourceUrl,
      title: `${target.companyName} ${target.year} 年永續報告書`,
      contentType: OBSERVATORY_CONTENT_TYPE.PDF,
      body: fileRes.body,
      metadata: esgReportMetadata(record),
    };
  },
};
