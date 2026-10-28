import {
  FINANCIAL_META_KEYS,
  FINANCIAL_UNIT,
  FinancialUnit,
  ROC_YEAR_OFFSET,
} from "@/constants/company_financial";
import { IFinancialOpenApiEndpoint } from "@/constants/company_observatory";
import { IFinancialFactInput } from "@/interfaces/company_observatory";
import {
  financialOpenApiRowsSchema,
  observatoryStockIdSchema,
} from "@/validators/company_observatory";

/**
 * Info: (20261023 - Luphia) 證交所／櫃買中心財務 OpenAPI 的回應 → 一個科目一筆。純函數。
 *
 * 規則全部是固定的：中繼欄位（代號、年度、季別、出表日期、名稱）不算科目；空字串代表該報表格式
 * 沒有這個科目，略過；值必須是十進位數字字串才收，原樣保留字串（不轉 number）。
 * 對不上格式的列（缺代號、年度不是數字）整列略過，不猜。
 */

const META_KEYS = new Set<string>(Object.values(FINANCIAL_META_KEYS).flat());
const DECIMAL = /^-?\d+(\.\d+)?$/;
const QUARTERS = new Set([1, 2, 3, 4]);

function firstValue(
  row: Record<string, string>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = row[key];
    if (value) return value;
  }
  return "";
}

/**
 * Info: (20261023 - Luphia) 科目的單位：標示「（元）」或以「每股」開頭的是每股金額（元），
 * 標示「股數」或「（單位：股）」的是股數，其餘是金額（仟元）。
 */
export function financialUnitOf(item: string): FinancialUnit {
  if (item.includes("股數") || item.includes("（單位：股）")) {
    return FINANCIAL_UNIT.SHARES;
  }
  if (item.includes("（元）") || item.startsWith("每股")) {
    return FINANCIAL_UNIT.NTD;
  }
  return FINANCIAL_UNIT.THOUSAND_NTD;
}

export function parseFinancialRows(
  body: unknown,
  endpoint: IFinancialOpenApiEndpoint,
  fetchedAt: Date,
): IFinancialFactInput[] {
  const rows = financialOpenApiRowsSchema.parse(body);
  const facts: IFinancialFactInput[] = [];

  for (const row of rows) {
    const stockId = observatoryStockIdSchema.safeParse(
      firstValue(row, FINANCIAL_META_KEYS.STOCK_ID),
    );
    const rocYear = Number(firstValue(row, FINANCIAL_META_KEYS.YEAR));
    const quarter = Number(firstValue(row, FINANCIAL_META_KEYS.QUARTER));
    if (
      !stockId.success ||
      !Number.isInteger(rocYear) ||
      rocYear <= 0 ||
      !QUARTERS.has(quarter)
    ) {
      continue;
    }
    const reportedAt = firstValue(row, FINANCIAL_META_KEYS.REPORTED_AT);

    for (const [item, value] of Object.entries(row)) {
      if (META_KEYS.has(item) || !DECIMAL.test(value)) continue;
      facts.push({
        stockId: stockId.data,
        year: rocYear + ROC_YEAR_OFFSET,
        quarter,
        statement: endpoint.statement,
        item,
        value,
        unit: financialUnitOf(item),
        form: endpoint.form,
        market: endpoint.market,
        reportedAt,
        sourceUrl: endpoint.url,
        fetchedAt,
      });
    }
  }
  return facts;
}
