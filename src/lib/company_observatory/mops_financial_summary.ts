import {
  FINANCIAL_BACKFILL_REQUESTS_PER_RUN,
  FINANCIAL_BACKFILL_YEARS,
  FINANCIAL_FORM_SIGNATURES,
  FINANCIAL_FORM_UNKNOWN,
  FINANCIAL_MARKET,
  FINANCIAL_STATEMENT,
  FinancialStatement,
  ROC_YEAR_OFFSET,
} from "@/constants/company_financial";
import {
  IFilingSchedule,
  MOPS_SUMMARY_URL,
  OBSERVATORY_FILING_GRACE_MS,
  OBSERVATORY_FILING_SCHEDULE,
  OBSERVATORY_SOURCE,
  ObservatorySource,
} from "@/constants/company_observatory";
import {
  IFinancialBackfillTarget,
  IFinancialFactInput,
} from "@/interfaces/company_observatory";
import { financialUnitOf } from "@/lib/company_observatory/financial_facts";
import { endOfFilingDate } from "@/lib/company_observatory/retry_policy";
import { observatoryStockIdSchema } from "@/validators/company_observatory";

/**
 * Info: (20261023 - Luphia) 公開資訊觀測站彙總報表（t163sb04 / t163sb05）：歷史財務數字回補。純函數。
 *
 * OpenAPI 只給最新一期；彙總報表可查任何一期，欄位名稱與 OpenAPI 相同，所以解析後寫進同一張表。
 * 表格依報表格式分開但沒有標示格式，以只有該格式才有的欄位辨識（FINANCIAL_FORM_SIGNATURES）。
 * 數值去掉千分位後必須是十進位數字才收；「--」代表該格式沒有這個科目，略過。
 */

const TABLE = /<table class='hasBorder'[^>]*>([\s\S]*?)<\/table>/g;
// Info: (20261023 - Luphia) 資產負債表的「每股參考淨值」表頭寫成 `<th>…</td>`（來源 HTML 原樣），兩種結尾都收
const HEADER = /<th[^>]*>([\s\S]*?)<\/t[hd]>/g;
const ROW = /<tr class='(?:even|odd)'>([\s\S]*?)<\/tr>/g;
const CELL = /<td[^>]*>([\s\S]*?)<\/td>/g;
const DECIMAL = /^-?\d+(\.\d+)?$/;
const STOCK_ID_COLUMN = "公司代號";
const COMPANY_NAME_COLUMN = "公司名稱";

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
};

function textOf(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&amp;|&lt;|&gt;/g, (entity) => ENTITIES[entity])
    .trim();
}

function formOf(headers: string[]) {
  const signature = FINANCIAL_FORM_SIGNATURES.find((s) =>
    headers.includes(s.column),
  );
  return signature ? signature.form : FINANCIAL_FORM_UNKNOWN;
}

// Info: (20261023 - Luphia) 查詢條件寫在 fragment：彙總報表是 POST，網址本身不帶條件
export function mopsSummarySourceUrl(target: IFinancialBackfillTarget): string {
  const params = new URLSearchParams({
    TYPEK: target.market,
    year: String(target.year - ROC_YEAR_OFFSET),
    season: String(target.quarter).padStart(2, "0"),
  });
  return `${MOPS_SUMMARY_URL[target.statement]}#${params.toString()}`;
}

export function mopsSummaryRequestBody(
  target: IFinancialBackfillTarget,
): string {
  return new URLSearchParams({
    encodeURIComponent: "1",
    step: "1",
    firstin: "1",
    off: "1",
    isQuery: "Y",
    TYPEK: target.market,
    year: String(target.year - ROC_YEAR_OFFSET),
    season: String(target.quarter).padStart(2, "0"),
  }).toString();
}

export function parseMopsSummaryHtml(
  html: string,
  target: IFinancialBackfillTarget,
  fetchedAt: Date,
): IFinancialFactInput[] {
  const facts: IFinancialFactInput[] = [];
  const sourceUrl = mopsSummarySourceUrl(target);

  for (const [, table] of html.matchAll(TABLE)) {
    const headers = Array.from(table.matchAll(HEADER), ([, h]) => textOf(h));
    const stockIdIndex = headers.indexOf(STOCK_ID_COLUMN);
    if (stockIdIndex < 0) continue;
    const form = formOf(headers);

    for (const [, row] of table.matchAll(ROW)) {
      const cells = Array.from(row.matchAll(CELL), ([, c]) => textOf(c));
      if (cells.length !== headers.length) continue;
      const stockId = observatoryStockIdSchema.safeParse(cells[stockIdIndex]);
      if (!stockId.success) continue;

      headers.forEach((item, index) => {
        if (item === STOCK_ID_COLUMN || item === COMPANY_NAME_COLUMN) return;
        const value = cells[index].replace(/,/g, "");
        if (!DECIMAL.test(value)) return;
        facts.push({
          stockId: stockId.data,
          year: target.year,
          quarter: target.quarter,
          statement: target.statement,
          item,
          value,
          unit: financialUnitOf(item),
          form,
          market: target.market,
          // Info: (20261023 - Luphia) 彙總報表沒有出表日期，留空，不以抓取時間冒充
          reportedAt: "",
          sourceUrl,
          fetchedAt,
        });
      });
    }
  }
  return facts;
}

// Info: (20261023 - Luphia) 季別 → 申報期限表裡的來源（第四季就是年度報告）
const SCHEDULE_SOURCE_OF_QUARTER: Record<number, ObservatorySource> = {
  1: OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q1,
  2: OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q2,
  3: OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT_Q3,
  4: OBSERVATORY_SOURCE.MOPS_FINANCIAL_REPORT,
};

// Info: (20261023 - Luphia) 申報窗口與觀測站排程用同一份期限表與同一個換算（retry_policy.endOfFilingDate）
function filingWindow(year: number, quarter: number) {
  const schedule = OBSERVATORY_FILING_SCHEDULE[
    SCHEDULE_SOURCE_OF_QUARTER[quarter]
  ] as IFilingSchedule;
  return {
    periodEnd: endOfFilingDate(year, schedule.periodEnd).getTime(),
    seasonEnd:
      endOfFilingDate(year, schedule.deadline).getTime() +
      OBSERVATORY_FILING_GRACE_MS,
  };
}

export function backfillKey(target: IFinancialBackfillTarget): string {
  return `${target.year}|${target.quarter}|${target.statement}|${target.market}`;
}

/**
 * Info: (20261023 - Luphia) 這次要向彙總報表查哪些期別。
 *
 * - 範圍：近 FINANCIAL_BACKFILL_YEARS 年、期間已結束的季別，上市與上櫃、損益表與資產負債表。
 * - 跳過 OpenAPI 今天剛給的那一期（避免兩個來源互相覆寫；OpenAPI 每天都會更新它）。
 * - 申報季中的期別每天重查（陸續有公司申報）；其餘只在資料庫裡完全沒有時才查。
 * - 申報季的排前面，缺的再依新到舊；每次最多 FINANCIAL_BACKFILL_REQUESTS_PER_RUN 支。
 */
export function planFinancialBackfill(params: {
  now: Date;
  present: Set<string>;
  openApiPeriods: Set<string>;
}): IFinancialBackfillTarget[] {
  const { now, present, openApiPeriods } = params;
  const currentYear = now.getFullYear();
  const inSeason: IFinancialBackfillTarget[] = [];
  const missing: IFinancialBackfillTarget[] = [];

  for (
    let year = currentYear;
    year > currentYear - FINANCIAL_BACKFILL_YEARS;
    year--
  ) {
    for (let quarter = 4; quarter >= 1; quarter--) {
      const { periodEnd, seasonEnd } = filingWindow(year, quarter);
      if (now.getTime() < periodEnd) continue;
      const isInSeason = now.getTime() <= seasonEnd;
      for (const market of Object.values(FINANCIAL_MARKET)) {
        if (openApiPeriods.has(`${year}|${quarter}|${market}`)) continue;
        for (const statement of Object.values(
          FINANCIAL_STATEMENT,
        ) as FinancialStatement[]) {
          const target = { year, quarter, statement, market };
          if (isInSeason) inSeason.push(target);
          else if (!present.has(backfillKey(target))) missing.push(target);
        }
      }
    }
  }
  return [...inSeason, ...missing].slice(
    0,
    FINANCIAL_BACKFILL_REQUESTS_PER_RUN,
  );
}
