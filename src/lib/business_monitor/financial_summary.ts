import { Prisma } from "@/generated";
import {
  FINANCIAL_KEY_ITEM,
  FINANCIAL_KEY_ITEM_SOURCES,
  FINANCIAL_NET_MARGIN_REVENUE_LABEL,
  FINANCIAL_PERIODS_SHOWN,
  FINANCIAL_RATIO,
  FINANCIAL_RATIO_DECIMALS,
  FinancialKeyItem,
} from "@/constants/company_financial";
import {
  IFinancialKeyValue,
  IFinancialPeriod,
  IFinancialRatioValue,
} from "@/interfaces/business_monitor";

/**
 * Info: (20261023 - Luphia) 一家公司的財務科目 → 公司頁的各期關鍵數字與比率。純函數。
 *
 * 計算一律用 Prisma.Decimal（CLAUDE.md §2）；比率只在同一期、同一份來源的科目之間計算，
 * 分母為 0 或缺科目就不給，不補值。不做跨期比較：損益是年初累計，不同季別不可直接相減。
 */

export interface IFinancialFactRow {
  year: number;
  quarter: number;
  statement: string;
  item: string;
  value: Prisma.Decimal | string;
  unit: string;
  reportedAt: string;
}

const HUNDRED = new Prisma.Decimal(100);

function percent(
  numerator: Prisma.Decimal | undefined,
  denominator: Prisma.Decimal | undefined,
): string | null {
  if (!numerator || !denominator || denominator.isZero()) return null;
  return numerator
    .div(denominator)
    .mul(HUNDRED)
    .toFixed(FINANCIAL_RATIO_DECIMALS);
}

function summarizePeriod(rows: IFinancialFactRow[]): IFinancialPeriod {
  const byItem = new Map(
    rows.map((row) => [`${row.statement}|${row.item}`, row]),
  );
  const items: IFinancialKeyValue[] = [];
  const decimals = new Map<FinancialKeyItem, Prisma.Decimal>();

  for (const [key, source] of Object.entries(FINANCIAL_KEY_ITEM_SOURCES) as [
    FinancialKeyItem,
    (typeof FINANCIAL_KEY_ITEM_SOURCES)[FinancialKeyItem],
  ][]) {
    const label = source.labels.find((candidate) =>
      byItem.has(`${source.statement}|${candidate}`),
    );
    if (!label) continue;
    const row = byItem.get(`${source.statement}|${label}`) as IFinancialFactRow;
    const value = new Prisma.Decimal(row.value);
    decimals.set(key, value);
    items.push({ key, label, value: value.toString(), unit: row.unit });
  }

  const ratios: IFinancialRatioValue[] = [];
  const debtRatio = percent(
    decimals.get(FINANCIAL_KEY_ITEM.TOTAL_LIABILITIES),
    decimals.get(FINANCIAL_KEY_ITEM.TOTAL_ASSETS),
  );
  if (debtRatio !== null) {
    ratios.push({ key: FINANCIAL_RATIO.DEBT_RATIO, value: debtRatio });
  }
  const revenueLabel = items.find(
    (item) => item.key === FINANCIAL_KEY_ITEM.REVENUE,
  )?.label;
  const netMargin =
    revenueLabel === FINANCIAL_NET_MARGIN_REVENUE_LABEL
      ? percent(
          decimals.get(FINANCIAL_KEY_ITEM.NET_INCOME),
          decimals.get(FINANCIAL_KEY_ITEM.REVENUE),
        )
      : null;
  if (netMargin !== null) {
    ratios.push({ key: FINANCIAL_RATIO.NET_MARGIN, value: netMargin });
  }

  const reportedAt =
    rows
      .map((row) => row.reportedAt)
      .sort()
      .pop() ?? "";
  return {
    year: rows[0].year,
    quarter: rows[0].quarter,
    reportedAt,
    items,
    ratios,
  };
}

export function buildFinancialPeriods(
  rows: IFinancialFactRow[],
): IFinancialPeriod[] {
  const byPeriod = new Map<string, IFinancialFactRow[]>();
  for (const row of rows) {
    const key = `${row.year}-${row.quarter}`;
    const list = byPeriod.get(key) ?? [];
    list.push(row);
    byPeriod.set(key, list);
  }
  return Array.from(byPeriod.values())
    .map(summarizePeriod)
    .sort((a, b) => b.year - a.year || b.quarter - a.quarter)
    .slice(0, FINANCIAL_PERIODS_SHOWN);
}
