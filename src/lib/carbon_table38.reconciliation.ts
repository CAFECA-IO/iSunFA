// Info: (20260803 - Tzuhan) 表3.8 三層勾稽(Issue B 第 3 點)
//
// Info: (20260803 - Tzuhan) 這是把外部報告的數字放進本系統帳本之前的唯一守門。
// Info: (20260803 - Tzuhan) 哲學與 #22 質量守恆一致:**先證明自洽,才准入帳**。
// Info: (20260803 - Tzuhan) 三條加總關係任一條不成立,就代表照抄過程掉了資料或原文本身有誤,
// Info: (20260803 - Tzuhan) 兩種情況都不該讓數字悄悄流進 ledger —— 進去之後就再也分不清是誰的錯。
//
// Info: (20260803 - Tzuhan) 全程 Prisma.Decimal:碳排量禁止原生浮點運算。
// Info: (20260803 - Tzuhan) 這裡尤其不能用 number —— 勾稽本身就是在比較兩個加總是否相等,
// Info: (20260803 - Tzuhan) 而浮點的加總順序會改變結果,那會讓勾稽的結論取決於資料列的排列順序。

import { Prisma } from "@/generated";
import {
  EmissionBasisEnum,
  ImportedQuantityStateEnum,
  RECONCILIATION_TOLERANCE_TONNE,
} from "@/constants/imported_quantity";
import { Iso14064Category } from "@/constants/esg";
import type { IParsedTable38 } from "@/lib/carbon_table38.parser";

export enum ReconciliationLevelEnum {
  /** Info: (20260803 - Tzuhan) Σ 子代碼 = 原文標示的該類別小計 */
  SUBCATEGORY_TO_CATEGORY = "SUBCATEGORY_TO_CATEGORY",
  /** Info: (20260803 - Tzuhan) Σ 類別小計 = 該廠址總計 */
  CATEGORY_TO_SITE = "CATEGORY_TO_SITE",
  /** Info: (20260803 - Tzuhan) Σ 廠址總計 = 表3.6 全公司總量 */
  SITE_TO_COMPANY = "SITE_TO_COMPANY",
}

export interface IReconciliationCheck {
  level: ReconciliationLevelEnum;
  /** Info: (20260803 - Tzuhan) 受檢對象(廠址 / 廠址+類別 / 全公司),供對帳說明指名道姓 */
  subject: string;
  expected: string;
  actual: string;
  /** Info: (20260803 - Tzuhan) actual - expected,帶正負號。**即使通過也要保留** */
  difference: string;
  isWithinTolerance: boolean;
}

export interface IReconciliationResult {
  isReconciled: boolean;
  checks: IReconciliationCheck[];
  /** Info: (20260803 - Tzuhan) 解析階段就沒讀懂的列。有任何一列即不予入帳(可能掉了資料) */
  unparsedRows: string[];
}

const TOLERANCE = new Prisma.Decimal(RECONCILIATION_TOLERANCE_TONNE);

const sumReported = (values: (string | null)[]): Prisma.Decimal =>
  values.reduce(
    (total, value) =>
      value === null ? total : total.add(new Prisma.Decimal(value)),
    new Prisma.Decimal(0),
  );

const buildCheck = (
  level: ReconciliationLevelEnum,
  subject: string,
  expected: Prisma.Decimal,
  actual: Prisma.Decimal,
): IReconciliationCheck => {
  const difference = actual.sub(expected);
  return {
    level,
    subject,
    expected: expected.toString(),
    actual: actual.toString(),
    difference: difference.toString(),
    // Info: (20260803 - Tzuhan) 取絕對值比較:少算與多算都是錯,方向不影響是否通過
    isWithinTolerance: difference.abs().lessThanOrEqualTo(TOLERANCE),
  };
};

export interface IReconcileOptions {
  /** Info: (20260803 - Tzuhan) 表3.6 的全公司總排放量(公噸 CO2e),第三層勾稽的對照值 */
  companyTotalTonne?: string;
  /** Info: (20260803 - Tzuhan) 要勾稽哪一個基準的廠址總計。預設所在地基準 */
  basis?: EmissionBasisEnum;
}

/**
 * Info: (20260803 - Tzuhan) 對解析結果做三層勾稽。
 *
 * 兩個刻意的設計:
 * 1. **NA / NS 不參與加總**,但也不當成 0 —— 它們是「沒有數字」,加總時直接不計入。
 *    原文的類別小計本身也是這樣算的(總公司類別五全 NA,小計就寫 NA 而非 0)。
 * 2. **通過的檢查也回傳差額**。0.0002 這種進位差要寫進對帳說明給人看,
 *    靜默吸收等於宣稱「完全相等」,而那不是事實。
 */
export function reconcileTable38(
  parsed: IParsedTable38,
  options: IReconcileOptions = {},
): IReconciliationResult {
  const basis = options.basis ?? EmissionBasisEnum.LOCATION;
  const checks: IReconciliationCheck[] = [];

  // Info: (20260803 - Tzuhan) 第一層:同廠址同類別的子代碼加總 vs 原文標示的類別小計
  const sites = Array.from(new Set(parsed.rows.map((row) => row.site)));
  sites.forEach((site) => {
    const siteRows = parsed.rows.filter((row) => row.site === site);
    const categories = Array.from(
      new Set(siteRows.map((row) => row.isoCategory)),
    );
    categories.forEach((category) => {
      const categoryRows = siteRows.filter(
        (row) => row.isoCategory === category,
      );
      /**
       * Info: (20260803 - Tzuhan) 小計改由 parsed.categorySubtotals 取得(版面中立):
       * 兩種版面把小計放在不同位置(子代碼列的第二欄 / 類別標籤獨立成列),
       * 解析器已收斂成同一份清單,此處因此不必知道版面差異。
       * 找不到就跳過該層檢查而非當成 0 —— 當成 0 會讓「原文沒印小計」
       * 與「原文印了 0」得到同一個結論。
       */
      const subtotal = parsed.categorySubtotals.find(
        (item) => item.site === site && item.isoCategory === category,
      )?.tonneCo2e;
      if (subtotal === undefined || subtotal === null) return;
      checks.push(
        buildCheck(
          ReconciliationLevelEnum.SUBCATEGORY_TO_CATEGORY,
          `${site} / ${category}`,
          new Prisma.Decimal(subtotal),
          sumReported(categoryRows.map((row) => row.tonneCo2e)),
        ),
      );
    });

    // Info: (20260803 - Tzuhan) 第二層:該廠址所有子代碼加總 vs 該廠址總計列
    const siteTotal = parsed.siteTotals.find(
      (total) => total.site === site && total.basis === basis,
    );
    if (siteTotal) {
      checks.push(
        buildCheck(
          ReconciliationLevelEnum.CATEGORY_TO_SITE,
          site,
          new Prisma.Decimal(siteTotal.tonneCo2e),
          sumReported(siteRows.map((row) => row.tonneCo2e)),
        ),
      );
    }
  });

  // Info: (20260803 - Tzuhan) 第三層:Σ 廠址總計 vs 表3.6 全公司總量(呼叫端提供)
  if (options.companyTotalTonne !== undefined) {
    const siteTotalsForBasis = parsed.siteTotals.filter(
      (total) => total.basis === basis,
    );
    checks.push(
      buildCheck(
        ReconciliationLevelEnum.SITE_TO_COMPANY,
        "全公司",
        new Prisma.Decimal(options.companyTotalTonne),
        sumReported(siteTotalsForBasis.map((total) => total.tonneCo2e)),
      ),
    );
  }

  return {
    /**
     * Info: (20260803 - Tzuhan) 有未解析的列即不予入帳。
     * 少讀一列時小計與總計往往「一起少」,勾稽反而會通過 ——
     * 所以未解析的列必須獨立成為否決條件,不能只靠加總關係把關。
     */
    isReconciled:
      parsed.unparsedRows.length === 0 &&
      checks.length > 0 &&
      checks.every((check) => check.isWithinTolerance),
    checks,
    unparsedRows: parsed.unparsedRows,
  };
}

/**
 * Info: (20260803 - Tzuhan) 被排除於帳本與桑基圖之外的項目(NA / NS)。
 * 桑基圖只畫 REPORTED 且 > 0 者,但被排除的必須在圖下方列出 ——
 * 一張只畫得出來的圖會讓人以為沒畫的都是零,而 NA/NS 的意思正好不是零。
 */
export function listExcludedEntries(parsed: IParsedTable38): {
  site: string;
  subCategory: string;
  state: ImportedQuantityStateEnum;
}[] {
  return parsed.rows
    .filter((row) => row.state !== ImportedQuantityStateEnum.REPORTED)
    .map((row) => ({
      site: row.site,
      subCategory: row.subCategory,
      state: row.state,
    }));
}

/**
 * Info: (20260803 - Tzuhan) 依 ISO 類別彙總 REPORTED 的排放量(公噸),供桑基圖第二層與圖表使用。
 * 回 Decimal 字串而非 number:這個值會直接顯示在報告上。
 */
export function sumByIsoCategory(
  parsed: IParsedTable38,
): Record<string, string> {
  const totals = new Map<Iso14064Category, Prisma.Decimal>();
  parsed.rows.forEach((row) => {
    if (row.tonneCo2e === null) return;
    const current = totals.get(row.isoCategory) ?? new Prisma.Decimal(0);
    totals.set(row.isoCategory, current.add(new Prisma.Decimal(row.tonneCo2e)));
  });
  return Object.fromEntries(
    Array.from(totals.entries()).map(([category, total]) => [
      category,
      total.toString(),
    ]),
  );
}
