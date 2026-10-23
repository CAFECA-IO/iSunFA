import { Prisma } from "@/generated";
import { FINANCIAL_RATIO_DECIMALS } from "@/constants/company_financial";
import { IEmissionYear } from "@/interfaces/business_monitor";

/**
 * Info: (20261023 - Luphia) 溫室氣體各年度的範疇數字 → 加上與前一年度的增減。純函數。
 *
 * 只比較「相鄰的揭露年度、同一範疇、資料邊界文字完全相同」的兩個數字，以 Prisma.Decimal 計算；
 * 邊界不同（例：台泥範疇三 2024 只算母公司、2025 涵蓋多家子公司）就不算，標示邊界有變。
 * 數字字串含千分位，去掉逗號後才轉 Decimal；轉不了的值不計算。
 */

const HUNDRED = new Prisma.Decimal(100);
const NUMBER = /^-?\d+(\.\d+)?$/;

function toDecimal(value: string): Prisma.Decimal | null {
  const plain = value.replace(/,/g, "").trim();
  return NUMBER.test(plain) ? new Prisma.Decimal(plain) : null;
}

export function withEmissionChanges(years: IEmissionYear[]): IEmissionYear[] {
  const sorted = [...years].sort((a, b) => b.year - a.year);
  return sorted.map((current, index) => {
    const previous = sorted[index + 1];
    return {
      ...current,
      scopes: current.scopes.map((scope) => {
        const before = previous?.scopes.find((s) => s.scope === scope.scope);
        if (!before) {
          return { ...scope, changePercent: null, boundaryChanged: false };
        }
        if (before.boundary !== scope.boundary) {
          return { ...scope, changePercent: null, boundaryChanged: true };
        }
        const now = toDecimal(scope.value);
        const then = toDecimal(before.value);
        const changePercent =
          now && then && !then.isZero()
            ? now
                .minus(then)
                .div(then)
                .mul(HUNDRED)
                .toFixed(FINANCIAL_RATIO_DECIMALS)
            : null;
        return { ...scope, changePercent, boundaryChanged: false };
      }),
    };
  });
}
