import {
  MOPS_ANNUAL_SEASON,
  MOPS_CALENDAR_YEAR_MARKER,
  MOPS_DOC_KIND_FINANCIAL,
  MOPS_DOC_ORIGIN,
  MOPS_DOC_QUERY_URL,
  MOPS_FINANCIAL_FILE_SUFFIXES,
  MOPS_THROTTLE_MARKERS,
  OBSERVATORY_CONTENT_TYPE,
  OBSERVATORY_FETCH_OUTCOME,
  OBSERVATORY_REASON,
  OBSERVATORY_SOURCE,
} from "@/constants/company_observatory";
import {
  IObservatoryDownloader,
  IObservatoryFetchResult,
  IObservatoryHttpClient,
  IObservatoryTarget,
} from "@/interfaces/company_observatory";
import { decodeBig5, isPdfBuffer } from "@/lib/company_observatory/content";
import { ObservatorySourceThrottledError } from "@/lib/company_observatory/errors";

/**
 * Info: (20261015 - Luphia) 公開資訊觀測站財務報告下載器。
 *
 * 走 MOPS 電子書（doc.twse.com.tw/server-java/t57sb01）：
 * 1. step=1 以民國年查該公司當年度所有「財務報告書」，頁面列出 `readfile2("A","2330","202504_2330_AI1.pdf")`；
 * 2. 取第四季（年度）報告，優先 AI1（IFRSs 合併），沒有才用 AI3（IFRSs 個體）；
 * 3. step=9 取得過渡頁，其中的 `/pdf/...` 是有時效的實體檔連結，再下載之。
 *
 * 記錄的 sourceUrl 是 step=9 的網址——那是穩定的，實體檔連結每次都不同。
 */

const FILE_PATTERN =
  /readfile2?\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+\.pdf)"\s*\)/gi;
const TRANSIT_LINK_PATTERN = /href=['"]?(\/pdf\/[^'"\s>]+\.pdf)['"]?/i;

export function toRocYear(year: number): number {
  return year - 1911;
}

export function isMopsThrottled(html: string): boolean {
  return MOPS_THROTTLE_MARKERS.some((marker) => html.includes(marker));
}

// Info: (20261015 - Luphia) 從查詢結果頁列出所有可下載的檔名
export function parseMopsFileNames(html: string): string[] {
  const names: string[] = [];
  for (const match of html.matchAll(FILE_PATTERN)) {
    if (!names.includes(match[3])) names.push(match[3]);
  }
  return names;
}

// Info: (20261015 - Luphia) 依後綴優先序挑出該年度第四季的財報檔名
export function selectAnnualFinancialFile(
  fileNames: string[],
  stockId: string,
  year: number,
): string | null {
  for (const suffix of MOPS_FINANCIAL_FILE_SUFFIXES) {
    const expected = `${year}${MOPS_ANNUAL_SEASON}_${stockId}_${suffix}.pdf`;
    const found = fileNames.find(
      (name) => name.toLowerCase() === expected.toLowerCase(),
    );
    if (found) return found;
  }
  return null;
}

/**
 * Info: (20261015 - Luphia) 查詢頁標示「會計期間：曆年制」時，年度報告的期間就是該年 1/1～12/31；
 * 非曆年制的公司頁面不會出現這個字樣，此時不填期間（不猜它的會計年度從哪天開始）。
 */
export function parseMopsAnnualPeriod(
  html: string,
  year: number,
): string | undefined {
  return html.includes(MOPS_CALENDAR_YEAR_MARKER)
    ? `${year}/01/01~${year}/12/31`
    : undefined;
}

export function parseMopsTransitLink(html: string): string | null {
  const match = html.match(TRANSIT_LINK_PATTERN);
  return match ? `${MOPS_DOC_ORIGIN}${match[1]}` : null;
}

export function buildMopsFileUrl(stockId: string, fileName: string): string {
  const params = new URLSearchParams({
    step: "9",
    kind: MOPS_DOC_KIND_FINANCIAL,
    co_id: stockId,
    filename: fileName,
  });
  return `${MOPS_DOC_QUERY_URL}?${params.toString()}`;
}

const FORM_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Referer: MOPS_DOC_QUERY_URL,
};

export const mopsFinancialReportDownloader: IObservatoryDownloader = {
  source: OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,

  async fetch(
    target: IObservatoryTarget,
    http: IObservatoryHttpClient,
  ): Promise<IObservatoryFetchResult> {
    const form = new URLSearchParams({
      step: "1",
      colorchg: "1",
      co_id: target.stockId,
      year: String(toRocYear(target.year)),
      seamon: "",
      mtype: MOPS_DOC_KIND_FINANCIAL,
    });
    const listRes = await http.request(MOPS_DOC_QUERY_URL, {
      method: "POST",
      headers: FORM_HEADERS,
      body: form.toString(),
    });
    if (listRes.status !== 200) {
      throw new Error(`MOPS list HTTP ${listRes.status}`);
    }
    const listHtml = decodeBig5(listRes.body);
    if (isMopsThrottled(listHtml)) {
      throw new ObservatorySourceThrottledError(
        OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,
        "MOPS throttled the query",
      );
    }

    const fileName = selectAnnualFinancialFile(
      parseMopsFileNames(listHtml),
      target.stockId,
      target.year,
    );
    if (!fileName) {
      return {
        outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
        reason: OBSERVATORY_REASON.NO_FILE,
        sourceUrl: MOPS_DOC_QUERY_URL,
      };
    }

    const sourceUrl = buildMopsFileUrl(target.stockId, fileName);
    const transitRes = await http.request(sourceUrl, {
      headers: { Referer: MOPS_DOC_QUERY_URL },
    });
    if (transitRes.status !== 200) {
      throw new Error(`MOPS transit HTTP ${transitRes.status}`);
    }

    let pdf = transitRes.body;
    if (!isPdfBuffer(pdf)) {
      const transitHtml = decodeBig5(transitRes.body);
      if (isMopsThrottled(transitHtml)) {
        throw new ObservatorySourceThrottledError(
          OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,
          "MOPS throttled the download",
        );
      }
      const fileUrl = parseMopsTransitLink(transitHtml);
      if (!fileUrl) throw new Error("MOPS transit page has no PDF link");
      const fileRes = await http.request(fileUrl, {
        headers: { Referer: MOPS_DOC_QUERY_URL },
      });
      if (fileRes.status !== 200) {
        throw new Error(`MOPS file HTTP ${fileRes.status}`);
      }
      pdf = fileRes.body;
    }
    if (!isPdfBuffer(pdf)) throw new Error("MOPS file is not a PDF");

    return {
      outcome: OBSERVATORY_FETCH_OUTCOME.FOUND,
      sourceUrl,
      title: `${target.companyName} ${target.year} 年度財務報告書（${fileName}）`,
      contentType: OBSERVATORY_CONTENT_TYPE.PDF,
      body: pdf,
      metadata: { period: parseMopsAnnualPeriod(listHtml, target.year) },
    };
  },
};
