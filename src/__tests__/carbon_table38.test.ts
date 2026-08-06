// Info: (20260803 - Tzuhan) 表3.8 解析與三層勾稽(Issue B 第 1~3 點)
// Info: (20260803 - Tzuhan) fixture 直接取自 2026-08-03 實測落地的原文表格(高興昌 2023 盤查報告 p.42–44),
// Info: (20260803 - Tzuhan) 不自造資料:自造的表格不會有合併儲存格攤平、千分位逗號、NA/NS 混排這些真實形狀,
// Info: (20260803 - Tzuhan) 而那三件事正是解析最容易錯的地方。

import { describe, it, expect } from "@jest/globals";
import { parseTable38 } from "@/lib/carbon_table38.parser";
import { mergeImportedLedgerEntries } from "@/lib/carbon_ledger_totals";
import type { IComputedLedgerEntry } from "@/types/carbon_chatbot.types";

import {
  listExcludedEntries,
  ReconciliationLevelEnum,
  reconcileTable38,
} from "@/lib/carbon_table38.reconciliation";
import { toLedgerEntries } from "@/lib/carbon_table38.ledger";
import { buildImportedLedger } from "@/lib/carbon_table38.pipeline";
import type { ICarbonSourceTable } from "@/lib/carbon_source_table.builder";
import { buildReconciliationDisclosure } from "@/lib/carbon_table38.disclosure";
import {
  buildCarbonDataTable,
  CarbonDataBadgeStateEnum,
  deriveDataBadgeState,
} from "@/lib/carbon_report_table.builder";
import {
  buildCarbonChartBlock,
  CARBON_CHART_DEFAULT_LABELS,
} from "@/lib/carbon_report_chart.builder";
import {
  CarbonChartTemplateEnum,
  CARBON_SANKEY_TOP_ITEM_COUNT,
} from "@/constants/carbon_report_charts";
import {
  EmissionBasisEnum,
  ImportedQuantityStateEnum,
  LedgerProvenanceEnum,
} from "@/constants/imported_quantity";
import {
  Iso14064SubCategory,
  formatIsoSubCategoryLabel,
} from "@/constants/iso14064_subcategory";
import {
  formatEsgScopeLabel,
  formatGhgCategoryLabel,
  GhgProtocolCategory,
  Iso14064Category,
} from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";

/**
 * Info: (20260803 - Tzuhan) 總公司完整一段(含 NA、NS、0.0000 三態並存),
 * 以及台北、屏東兩廠址的關鍵列。屏東那列刻意保留原文的千分位逗號寫法。
 */
const TABLE_38 = `
| 公司 | 報告邊界類型 | 報告邊界 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) |
| --- | --- | --- | --- | --- |
| (1) 總公司 | 類別一 | 1.1 固定式燃燒 | 0.4375 | 17.8494 |
| (1) 總公司 | | 1.2 移動式燃燒 | 9.0759 | |
| (1) 總公司 | | 1.3 產業過程 | 0.0000 | |
| (1) 總公司 | | 1.4 人為系統/逸散 | 8.3360 | |
| (1) 總公司 | | 1.5 土地使用與變更、林業之排放與移除 | 0.0000 | |
| (1) 總公司 | 類別二 | 2.1 外購電力 | 139.4858 | 139.4858 |
| (1) 總公司 | | 2.2 外購能源 | 0.0000 | |
| (1) 總公司 | 類別三 | 3.1 上游運輸 | NS | 16.2308 |
| (1) 總公司 | | 3.2 下游運輸 | NS | |
| (1) 總公司 | | 3.3 員工通勤 | 15.4379 | |
| (1) 總公司 | | 3.4 客戶與訪客運輸 | NA | |
| (1) 總公司 | | 3.5 業務旅運 | 0.7929 | |
| (1) 總公司 | 類別四 | 4.1 採購貨物 | 27.8985 | 27.8985 |
| (1) 總公司 | | 4.2 資本財 | NA | |
| (1) 總公司 | | 4.3 固體或液體廢棄物 | NA | |
| (1) 總公司 | | 4.4 資產使用 | NA | |
| (1) 總公司 | | 4.5 服務使用 | NA | |
| (1) 總公司 | 類別五 | 5.1 產品使用階段排放或移除 | NA | NA |
| (1) 總公司 | | 5.2 下游承租資產 | NA | |
| (1) 總公司 | | 5.3 產品生命終止階段 | NA | |
| (1) 總公司 | | 5.4 投資運作 | NA | |
| (1) 總公司 | 類別六 | - | NA | NA |
| (1) 總公司 | 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | | 201.465 | |
| (1) 總公司 | 直接與間接溫室氣體總排放量-市場基準 (公噸 CO2e/年) | | 201.465 | |
| (2) 台北分公司 | 類別一 | 1.1 固定式燃燒 | 0.0000 | 1.5133 |
| (2) 台北分公司 | | 1.2 移動式燃燒 | 1.1221 | |
| (2) 台北分公司 | | 1.4 人為系統/逸散 | 0.3912 | |
| (2) 台北分公司 | 類別二 | 2.1 外購電力 | 5.8344 | 5.8344 |
| (2) 台北分公司 | 類別三 | 3.3 員工通勤 | 0.1887 | 0.6892 |
| (2) 台北分公司 | | 3.5 業務旅運 | 0.5005 | |
| (2) 台北分公司 | 類別四 | 4.1 採購貨物 | 1.1613 | 1.1613 |
| (2) 台北分公司 | 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | | 9.1982 | |
| (3) 屏東分公司 | 類別一 | 1.1 固定式燃燒 | 2,591.8615 | 2814.0773 |
| (3) 屏東分公司 | | 1.2 移動式燃燒 | 13.2206 | |
| (3) 屏東分公司 | | 1.3 產業過程 | 189.0363 | |
| (3) 屏東分公司 | | 1.4 人為系統/逸散 | 19.9589 | |
| (3) 屏東分公司 | 類別二 | 2.1 外購電力 | 3325.0152 | 3325.0152 |
| (3) 屏東分公司 | 類別三 | 3.1 上游運輸 | 176.8211 | 1226.2346 |
| (3) 屏東分公司 | | 3.2 下游運輸 | 927.4575 | |
| (3) 屏東分公司 | | 3.3 員工通勤 | 118.8558 | |
| (3) 屏東分公司 | | 3.5 業務旅運 | 3.1002 | |
| (3) 屏東分公司 | 類別四 | 4.1 採購貨物 | 654.9068 | 756.5913 |
| (3) 屏東分公司 | | 4.3 固體或液體廢棄物 | 101.6845 | |
| (3) 屏東分公司 | 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | | 8121.918 | |
`.trim();

/**
 * Info: (20260803 - Tzuhan) **第二輪**實測落地的版面(issue_drafts/inventory_table_import/01)。
 *
 * 同一份 PDF、同一組提示詞,模型換一輪就改變攤平策略:廠址與類別小計各自獨立成列,
 * 且每個廠址前重複一次表頭。兩份 fixture 都要留 —— 只留新的等於把第一輪的迴歸風險丟掉,
 * 而版面既然會變,它隨時可能變回來。
 *
 * 原文第三個廠址的序號誤寫為 (1)(原文自身的錯字),照錄不修正。
 */
const TABLE_38_LAYOUT_B = `
| 報告邊界 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) | 類型 |
| :--- | :--- | :--- | :--- |
| (1) 總公司 | | | |
| 類別一 | | 17.8494 | |
| 1.1 固定式燃燒 | 0.4375 | | |
| 1.2 移動式燃燒 | 9.0759 | | |
| 1.3 產業過程 | 0.0000 | | |
| 1.4 人為系統/逸散 | 8.3360 | | |
| 1.5 土地使用與變更、 林業之排放與移除 | 0.0000 | | |
| 類別二 | | 139.4858 | |
| 2.1 外購電力 | 139.4858 | | |
| 2.2 外購能源 | 0.0000 | | |
| 類別三 | | 16.2308 | |
| 3.1 上游運輸 | NS | | |
| 3.2 下游運輸 | NS | | |
| 3.3 員工通勤 | 15.4379 | | |
| 3.4 客戶與訪客運輸 | NA | | |
| 3.5 業務旅運 | 0.7929 | | |
| 類別四 | | 27.8985 | |
| 4.1 採購貨物 | 27.8985 | | |
| 4.2 資本財 | NA | | |
| 4.3 固體或液體廢棄物 | NA | | |
| 4.4 資產使用 | NA | | |
| 4.5 服務使用 | NA | | |
| 類別五 | | NA | |
| 5.1 產品使用階段排放 或移除 | NA | | |
| 5.2 下游承租資產 | NA | | |
| 5.3 產品生命終止階段 | NA | | |
| 5.4 投資運作 | NA | | |
| 類別六 | - | NA | NA |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | 201.465 | | |
| 直接與間接溫室氣體總排放量-市場基準 (公噸 CO2e/年) | 201.465 | | |
| (2) 台北分公司 | | | |
| 報告邊界 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) | 類型 |
| 類別一 | | 1.5133 | |
| 1.1 固定式燃燒 | 0.0000 | | |
| 1.2 移動式燃燒 | 1.1221 | | |
| 1.3 產業過程 | 0.0000 | | |
| 1.4 人為系統/逸散 | 0.3912 | | |
| 1.5 土地使用與變更、林 業之排放與移除 | 0.0000 | | |
| 類別二 | | 5.8344 | |
| 2.1 外購電力 | 5.8344 | | |
| 2.2 外購能源 | 0.0000 | | |
| 類別三 | | 0.6892 | |
| 3.1 上游運輸 | NA | | |
| 3.2 下游運輸 | NA | | |
| 3.3 員工通勤 | 0.1887 | | |
| 3.4 客戶與訪客運輸 | NA | | |
| 3.5 業務旅運 | 0.5005 | | |
| 類別四 | | 1.1613 | |
| 4.1 採購貨物 | 1.1613 | | |
| 4.2 資本財 | NA | | |
| 4.3 固體或液體廢棄物 | NA | | |
| 4.4 資產使用 | NA | | |
| 4.5 服務使用 | NA | | |
| 類別五 | | NA | |
| 5.1 產品使用階段排放 或移除 | NA | | |
| 5.2 下游承租資產 | NA | | |
| 5.3 產品生命終止階段 | NA | | |
| 5.4 投資運作 | NA | | |
| 類別六 | - | NA | NA |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | 9.1982 | | |
| 直接與間接溫室氣體總排放量-市場基準 (公噸 CO2e/年) | 9.1982 | | |
| (1) 屏東分公司 | | | |
| 報告邊界 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) | 類型 |
| 類別一 | | 2814.0773 | |
| 1.1 固定式燃燒 | 2591.8615 | | |
| 1.2 移動式燃燒 | 13.2206 | | |
| 1.3 產業過程 | 189.0363 | | |
| 1.4 人為系統/逸散 | 19.9589 | | |
| 1.5 土地使用與變更、 林業之排放與移除 | 0.0000 | | |
| 類別二 | | 3325.0152 | |
| 2.1 外購電力 | 3325.0152 | | |
| 2.2 外購能源 | 0.0000 | | |
| 類別三 | | 1226.2346 | |
| 3.1 上游運輸 | 176.8211 | | |
| 3.2 下游運輸 | 927.4575 | | |
| 3.3 員工通勤 | 118.8558 | | |
| 3.4 客戶與訪客運輸 | NA | | |
| 3.5 業務旅運 | 3.1002 | | |
| 類別四 | | 756.5913 | |
| 4.1 採購貨物 | 654.9068 | | |
| 4.2 資本財 | NA | | |
| 4.3 固體或液體廢棄物 | 101.6845 | | |
| 4.4 資產使用 | NA | | |
| 4.5 服務使用 | NA | | |
| 類別五 | | NA | |
| 5.1 產品使用階段排放 或移除 | NA | | |
| 5.2 下游承租資產 | NA | | |
| 5.3 產品生命終止階段 | NA | | |
| 5.4 投資運作 | NA | | |
| 類別六 | - | NA | NA |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | 8121.918 | | |
| 直接與間接溫室氣體總排放量-市場基準 (公噸 CO2e/年) | 8121.918 | | |
`.trim();

// Info: (20260803 - Tzuhan) 表3.6 的全公司總量(第三層勾稽的對照值)
const COMPANY_TOTAL = "8332.581";

describe("parseTable38", () => {
  const parsed = parseTable38(TABLE_38);

  it("沒有讀不懂的資料列", () => {
    expect(parsed.unparsedRows).toEqual([]);
  });

  it("廠址沿用:合併儲存格攤平後的空欄不會讓後續列失去廠址", () => {
    const sites = Array.from(new Set(parsed.rows.map((row) => row.site)));
    expect(sites).toEqual(["(1) 總公司", "(2) 台北分公司", "(3) 屏東分公司"]);
    // Info: (20260803 - Tzuhan) 總公司共 22 列:類別一 5 + 二 2 + 三 5 + 四 5 + 五 4 + 六 1
    expect(parsed.rows.filter((row) => row.site === "(1) 總公司")).toHaveLength(
      22,
    );
  });

  /**
   * Info: (20260803 - Tzuhan) 本檔最重要的一組:三態必須分得開。
   * 若 NA/NS 被壓成 0,「沒盤查」就會長得跟「盤查後為零」一樣 ——
   * 那不是精度問題,是把未知偽裝成已知。
   */
  describe("NA / NS / 0.0000 三態", () => {
    const rowOf = (site: string, subCategory: Iso14064SubCategory) =>
      parsed.rows.find(
        (row) => row.site === site && row.subCategory === subCategory,
      );

    it("NS 保存為 NOT_SIGNIFICANT 且數值為 null(不是 0)", () => {
      const row = rowOf("(1) 總公司", Iso14064SubCategory.UPSTREAM_TRANSPORT);
      expect(row?.state).toBe(ImportedQuantityStateEnum.NOT_SIGNIFICANT);
      expect(row?.tonneCo2e).toBeNull();
      expect(row?.co2eKg).toBeNull();
    });

    it("NA 保存為 NOT_APPLICABLE 且數值為 null(不是 0)", () => {
      const row = rowOf("(1) 總公司", Iso14064SubCategory.CAPITAL_GOODS);
      expect(row?.state).toBe(ImportedQuantityStateEnum.NOT_APPLICABLE);
      expect(row?.tonneCo2e).toBeNull();
    });

    it("原文明寫的 0.0000 是 REPORTED(已鑑別且量化為零)", () => {
      const row = rowOf("(1) 總公司", Iso14064SubCategory.INDUSTRIAL_PROCESS);
      expect(row?.state).toBe(ImportedQuantityStateEnum.REPORTED);
      expect(row?.tonneCo2e).toBe("0");
    });

    it("三態不可互換:NA 與 0.0000 落在不同狀態", () => {
      const na = rowOf("(1) 總公司", Iso14064SubCategory.ASSET_USE);
      const zero = rowOf("(1) 總公司", Iso14064SubCategory.LAND_USE);
      expect(na?.state).not.toBe(zero?.state);
    });
  });

  it("千分位逗號的數值正確解析(原文寫 2,591.8615)", () => {
    const row = parsed.rows.find(
      (item) =>
        item.site === "(3) 屏東分公司" &&
        item.subCategory === Iso14064SubCategory.STATIONARY_COMBUSTION,
    );
    expect(row?.tonneCo2e).toBe("2591.8615");
  });

  it("公噸 → 公斤為 Decimal 精確換算(不得出現浮點尾差)", () => {
    const row = parsed.rows.find(
      (item) =>
        item.site === "(3) 屏東分公司" &&
        item.subCategory === Iso14064SubCategory.STATIONARY_COMBUSTION,
    );
    // Info: (20260803 - Tzuhan) 2591.8615 * 1000 用原生浮點會得到 2591861.4999999995
    expect(row?.co2eKg).toBe("2591861.5");
  });

  it("子代碼映射到 ISO 類別與 GHG Protocol 範疇", () => {
    const commuting = parsed.rows.find(
      (row) => row.subCategory === Iso14064SubCategory.EMPLOYEE_COMMUTING,
    );
    expect(commuting?.isoCategory).toBe(Iso14064Category.CATEGORY_3);
    expect(commuting?.scope).toBe(GhgProtocolCategory.SCOPE_3_CAT_7);

    const electricity = parsed.rows.find(
      (row) => row.subCategory === Iso14064SubCategory.PURCHASED_ELECTRICITY,
    );
    expect(electricity?.scope).toBe(GhgProtocolCategory.SCOPE_2_INDIRECT);
  });

  it("類別六(單層代碼,無小數點)也要能解析", () => {
    const row = parsed.rows.find(
      (item) => item.subCategory === Iso14064SubCategory.OTHER_INDIRECT,
    );
    expect(row?.isoCategory).toBe(Iso14064Category.CATEGORY_6);
    expect(row?.state).toBe(ImportedQuantityStateEnum.NOT_APPLICABLE);
  });

  it("兩種基準的廠址總計分別記錄(不可混為一筆)", () => {
    const headOffice = parsed.siteTotals.filter(
      (total) => total.site === "(1) 總公司",
    );
    expect(headOffice).toHaveLength(2);
    expect(
      headOffice.map((total) => total.basis).sort((a, b) => a.localeCompare(b)),
    ).toEqual([EmissionBasisEnum.LOCATION, EmissionBasisEnum.MARKET]);
  });
});

describe("reconcileTable38", () => {
  const parsed = parseTable38(TABLE_38);

  it("實測資料三層全部通過", () => {
    const result = reconcileTable38(parsed, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    const failed = result.checks.filter((check) => !check.isWithinTolerance);
    expect(failed).toEqual([]);
    expect(result.isReconciled).toBe(true);
  });

  /**
   * Info: (20260803 - Tzuhan) 容差的存在理由:發布數字自己就是四捨五入過的。
   * Σ 廠址 = 201.465 + 9.1982 + 8121.918 = 8332.5812,而表3.6 印 8332.581。
   * 差額 0.0002 必須通過,而且必須被記錄下來 —— 靜默吸收等於宣稱兩者完全相等。
   */
  it("0.0002 的發布進位差通過,但差額仍被記錄", () => {
    const result = reconcileTable38(parsed, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    const check = result.checks.find(
      (item) => item.level === ReconciliationLevelEnum.SITE_TO_COMPANY,
    );
    expect(check?.isWithinTolerance).toBe(true);
    expect(check?.difference).toBe("0.0002");
    expect(check?.actual).toBe("8332.5812");
  });

  it("0.01 的差額不通過(容差不可寬到吃掉真實錯帳)", () => {
    const result = reconcileTable38(parsed, {
      companyTotalTonne: "8332.5712",
    });
    const check = result.checks.find(
      (item) => item.level === ReconciliationLevelEnum.SITE_TO_COMPANY,
    );
    expect(check?.isWithinTolerance).toBe(false);
    expect(result.isReconciled).toBe(false);
  });

  it("篡改單一子代碼 → 第一層勾稽失敗", () => {
    const tampered = TABLE_38.replace("| 9.0759 |", "| 9.9999 |");
    const result = reconcileTable38(parseTable38(tampered), {
      companyTotalTonne: COMPANY_TOTAL,
    });
    const failed = result.checks.filter((check) => !check.isWithinTolerance);
    expect(
      failed.some(
        (check) =>
          check.level === ReconciliationLevelEnum.SUBCATEGORY_TO_CATEGORY,
      ),
    ).toBe(true);
    expect(result.isReconciled).toBe(false);
  });

  it("篡改類別小計 → 第一層勾稽失敗", () => {
    const tampered = TABLE_38.replace(
      "| 139.4858 | 139.4858 |",
      "| 139.4858 | 200.0000 |",
    );
    const result = reconcileTable38(parseTable38(tampered));
    expect(result.isReconciled).toBe(false);
  });

  it("篡改廠址總計 → 第二層勾稽失敗", () => {
    const tampered = TABLE_38.replace("| 8121.918 |", "| 9121.918 |");
    const result = reconcileTable38(parseTable38(tampered));
    const failed = result.checks.filter((check) => !check.isWithinTolerance);
    expect(
      failed.some(
        (check) => check.level === ReconciliationLevelEnum.CATEGORY_TO_SITE,
      ),
    ).toBe(true);
  });

  /**
   * Info: (20260803 - Tzuhan) 少讀一列時小計與總計常會「一起少」,加總關係反而成立。
   * 所以未解析的列必須獨立成為否決條件,不能只靠勾稽把關。
   */
  it("有讀不懂的資料列即不予入帳(即使加總關係成立)", () => {
    const withGarbage = `${TABLE_38}\n| (3) 屏東分公司 | 類別九 | 9.9 未知代碼 | 123.456 | |`;
    const result = reconcileTable38(parseTable38(withGarbage));
    expect(result.unparsedRows).toHaveLength(1);
    expect(result.isReconciled).toBe(false);
  });

  it("NA / NS 不參與加總(否則類別三小計會對不上)", () => {
    const result = reconcileTable38(parsed);
    const check = result.checks.find(
      (item) => item.subject === `(1) 總公司 / ${Iso14064Category.CATEGORY_3}`,
    );
    // Info: (20260803 - Tzuhan) 15.4379 + 0.7929 = 16.2308,兩筆 NS 與一筆 NA 皆不計入
    expect(check?.actual).toBe("16.2308");
    expect(check?.isWithinTolerance).toBe(true);
  });
});

describe("listExcludedEntries", () => {
  it("列出所有 NA / NS 項目(桑基圖不畫,但必須揭露)", () => {
    const excluded = listExcludedEntries(parseTable38(TABLE_38));
    expect(
      excluded.every(
        (entry) => entry.state !== ImportedQuantityStateEnum.REPORTED,
      ),
    ).toBe(true);
    expect(
      excluded.some(
        (entry) =>
          entry.site === "(1) 總公司" &&
          entry.subCategory === Iso14064SubCategory.UPSTREAM_TRANSPORT &&
          entry.state === ImportedQuantityStateEnum.NOT_SIGNIFICANT,
      ),
    ).toBe(true);
  });
});

describe("toLedgerEntries", () => {
  const parsed = parseTable38(TABLE_38);
  const reconciled = reconcileTable38(parsed, {
    companyTotalTonne: COMPANY_TOTAL,
  });

  it("勾稽通過即寫入,全部標記 IMPORTED", () => {
    const result = toLedgerEntries(parsed, reconciled, { tableNo: "表3.8" });
    expect(result.blockedReason).toBeNull();
    expect(result.entries.length).toBeGreaterThan(0);
    expect(
      result.entries.every(
        (entry) => entry.provenance === LedgerProvenanceEnum.IMPORTED,
      ),
    ).toBe(true);
  });

  /**
   * Info: (20260803 - Tzuhan) NA/NS 不入帳。若寫 0 進帳本,總量不變但**項目數會膨脹**,
   * 而每一筆 0 都在宣稱「這個排放源已量化為零」—— 原文的意思恰好相反。
   */
  it("只寫 REPORTED,NA / NS 不入帳", () => {
    const result = toLedgerEntries(parsed, reconciled, { tableNo: "表3.8" });
    const reportedCount = parsed.rows.filter(
      (row) => row.state === ImportedQuantityStateEnum.REPORTED,
    ).length;
    expect(result.entries).toHaveLength(reportedCount);
    expect(result.entries.some((entry) => entry.co2eKg === null)).toBe(false);
  });

  it("Decimal 換算沿用解析結果(公斤,零浮點誤差)", () => {
    const result = toLedgerEntries(parsed, reconciled, { tableNo: "表3.8" });
    const pingtung = result.entries.find((entry) =>
      entry.sourceName.includes("(3) 屏東分公司 1.1"),
    );
    expect(pingtung?.co2eKg).toBe("2591861.5");
  });

  it("帶得出廠址與 ISO 類別(桑基圖三層需要)", () => {
    const result = toLedgerEntries(parsed, reconciled, { tableNo: "表3.8" });
    const entry = result.entries[0];
    expect(entry.importedOrigin?.site).toBe("(1) 總公司");
    expect(entry.importedOrigin?.tableNo).toBe("表3.8");
    expect(entry.emissionBasis).toBe(EmissionBasisEnum.LOCATION);
  });

  /**
   * Info: (20260803 - Tzuhan) 勾稽沒過就一筆都不寫。半套資料進帳本之後,
   * 每一張圖與每一個小計都是錯的,而且錯得很像對的(比例看起來合理)。
   */
  it("勾稽未通過:一筆都不寫,並回傳可讀的理由", () => {
    const tampered = parseTable38(
      TABLE_38.replace("| 8121.918 |", "| 9121.918 |"),
    );
    const failed = reconcileTable38(tampered);
    const result = toLedgerEntries(tampered, failed, { tableNo: "表3.8" });
    expect(result.entries).toEqual([]);
    expect(result.blockedReason).toContain("差額");
  });

  it("沒有係數就不假裝有(不寫成 1)", () => {
    const result = toLedgerEntries(parsed, reconciled, { tableNo: "表3.8" });
    expect(result.entries[0].factor.value).not.toBe("1");
    expect(result.entries[0].factor.source).toBe("表3.8");
  });
});

/**
 * Info: (20260804 - Tzuhan) 匯入項目進系統表格,但逐列標示來源(取代 20260803 的整批排除)。
 *
 * 「兩者並存但絕不合併」守的是**查核者要分得出哪列是我們算的**,
 * 而分辨的手段是把來源寫在表上,不是把資料藏起來 ——
 * 藏起來的代價是 3.6「排放總量匯總表」印著「資料不足」,而總量就在 ledger 裡。
 */
describe("匯入項目進系統表格但標示來源", () => {
  const block = ((): string => {
    const parsedLocal = parseTable38(TABLE_38);
    const reconciledLocal = reconcileTable38(parsedLocal, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    const { entries } = toLedgerEntries(parsedLocal, reconciledLocal, {
      tableNo: "表3.8",
    });
    return buildCarbonDataTable(mergeImportedLedgerEntries(undefined, entries));
  })();

  it("列出匯入項目,不再一律印資料不足", () => {
    expect(block).toContain("2,591,861.5");
    expect(block).not.toContain("資料不足");
  });

  it("逐列標示原文照錄與表號", () => {
    expect(block).toContain("原文照錄(表3.8)");
  });

  /**
   * Info: (20260804 - Tzuhan) 匯入項目的 convertedQuantity 塞的是排放當量本身,
   * 不是活動數據。印進「活動數據」欄會與右邊的排放量差 1000 倍,讀成「係數是 1000」。
   */
  it("活動數據與排放係數兩欄明示原文未提供,不得填數字", () => {
    const importedRow = block
      .split("\n")
      .find((line) => line.includes("(1) 總公司 1.1"));
    expect(importedRow).toBeDefined();
    const cells = importedRow!.split("|").map((cell) => cell.trim());
    expect(cells[3]).toBe("原文未提供");
    expect(cells[4]).toBe("原文未提供");
  });

  it("範疇小計與總計有數字(這一節的標題就是排放總量匯總)", () => {
    expect(block).toContain("**總排放量**");
    expect(block).toContain("8,332,581.1");
  });
});

/**
 * Info: (20260804 - Tzuhan) 徽章與表格必須對同一份 ledger 說同一件事。
 * 先前徽章看 entries.length、表格看過濾後的 computedEntries,
 * 於是同一段徽章顯示「已勾稽 ✓(數字由決定論引擎產出)」、表格顯示「資料不足」。
 */
describe("徽章以 provenance 裁決", () => {
  const importedEntry = ((): IComputedLedgerEntry => {
    const parsedLocal = parseTable38(TABLE_38);
    const reconciledLocal = reconcileTable38(parsedLocal, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    return toLedgerEntries(parsedLocal, reconciledLocal, { tableNo: "表3.8" })
      .entries[0];
  })();

  it("只有匯入項目時不宣稱由決定論引擎產出", () => {
    const ledger = mergeImportedLedgerEntries(undefined, [importedEntry]);
    expect(deriveDataBadgeState(ledger)).toBe(
      CarbonDataBadgeStateEnum.IMPORTED,
    );
  });

  it("混合時仍落在 IMPORTED(只要有一列是抄的,那句話對整段就不成立)", () => {
    const computed: IComputedLedgerEntry = {
      activityKey: "voucher:1",
      scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
      sourceName: "柴油",
      quantityRaw: "10",
      convertedQuantity: "10",
      convertedUnit: MeasurementUnit.LITER,
      co2eKg: "26",
      factor: {
        factorId: "f",
        name: "f",
        value: "2.6",
        unit: "kg",
        source: "係數庫",
      },
    };
    const ledger = mergeImportedLedgerEntries(
      {
        entries: [computed],
        pending: [],
        scopeSubtotals: {},
        totalCo2eKg: "0",
        computedAt: new Date().toISOString(),
      },
      [importedEntry],
    );
    expect(deriveDataBadgeState(ledger)).toBe(
      CarbonDataBadgeStateEnum.IMPORTED,
    );
  });
});

describe("buildReconciliationDisclosure", () => {
  const parsed = parseTable38(TABLE_38);
  const reconciled = reconcileTable38(parsed, {
    companyTotalTonne: COMPANY_TOTAL,
  });
  const text = buildReconciliationDisclosure({
    parsed,
    reconciliation: reconciled,
    tableNo: "表3.8",
  });

  it("標明來源表號與基準", () => {
    expect(text).toContain("表3.8");
    expect(text).toContain("所在地基準");
  });

  // Info: (20260803 - Tzuhan) 在容差內的差額也要寫出來:靜默吸收等於宣稱兩者完全相等
  it("即使通過也寫出實際差額", () => {
    expect(text).toContain("0.0002");
  });

  it("列出通過的檢查,不只列失敗", () => {
    expect(text).toContain("✓");
    expect(text).toContain("廠址加總 vs 表3.6 全公司總量");
  });

  it("列出被排除的 NA / NS 項目與其狀態", () => {
    expect(text).toContain("未納入計算的項目");
    expect(text).toContain("不顯著、未量化(NS)");
    expect(text).toContain("不適用(NA)");
  });

  it("揭露近似映射(隱藏判斷等於沒有依據)", () => {
    expect(text).toContain("分類對應的近似之處");
    expect(text).toContain("3.4");
    expect(text).toContain("4.5");
  });

  it("勾稽失敗時明示未寫入帳本", () => {
    const tampered = parseTable38(
      TABLE_38.replace("| 8121.918 |", "| 9121.918 |"),
    );
    const failedText = buildReconciliationDisclosure({
      parsed: tampered,
      reconciliation: reconcileTable38(tampered),
      tableNo: "表3.8",
    });
    expect(failedText).toContain("未寫入帳本");
    expect(failedText).toContain("✗");
  });
});

/**
 * Info: (20260803 - Tzuhan) 第二種版面(廠址與類別小計獨立成列 + 重複表頭)。
 * 這一組是 issue 01 的驗收:實測時它讓 15 列無法解析、且表頭「報告邊界」被當成廠址名,
 * 台北與屏東的資料全部併進假廠址(差額 8121.9184)。
 */
describe("表3.8 第二種版面", () => {
  const parsed = parseTable38(TABLE_38_LAYOUT_B);

  it("沒有讀不懂的資料列(類別小計獨立成列也要認得)", () => {
    expect(parsed.unparsedRows).toEqual([]);
  });

  /**
   * Info: (20260803 - Tzuhan) 最關鍵的一項:重複表頭的「報告邊界」不可成為廠址。
   * 誤認的後果不是報錯,而是資料歸屬悄悄改變 —— 總量還對得上,分佈全錯。
   */
  it("重複表頭不被當成廠址", () => {
    const sites = Array.from(new Set(parsed.rows.map((row) => row.site)));
    expect(sites).not.toContain("報告邊界");
    expect(sites).toHaveLength(3);
  });

  it("三個廠址各自獨立(原文第三個誤寫為 (1) 也照錄不合併)", () => {
    const sites = Array.from(new Set(parsed.rows.map((row) => row.site)));
    expect(sites).toEqual(["(1) 總公司", "(2) 台北分公司", "(1) 屏東分公司"]);
  });

  it("類別小計獨立成列時仍取得(供第一層勾稽)", () => {
    const headOfficeCat3 = parsed.categorySubtotals.find(
      (item) =>
        item.site === "(1) 總公司" &&
        item.isoCategory === Iso14064Category.CATEGORY_3,
    );
    expect(headOfficeCat3?.tonneCo2e).toBe("16.2308");
  });

  it("原文小計為 NA 時記為 null(不是 0)", () => {
    const cat5 = parsed.categorySubtotals.find(
      (item) =>
        item.site === "(1) 總公司" &&
        item.isoCategory === Iso14064Category.CATEGORY_5,
    );
    expect(cat5?.tonneCo2e).toBeNull();
  });

  it("類別六仍產出一筆資料列(開放類別本身沒有子項)", () => {
    const row = parsed.rows.find(
      (item) =>
        item.site === "(1) 總公司" &&
        item.subCategory === Iso14064SubCategory.OTHER_INDIRECT,
    );
    expect(row?.state).toBe(ImportedQuantityStateEnum.NOT_APPLICABLE);
  });

  it("三態仍分得開", () => {
    const ns = parsed.rows.find(
      (item) =>
        item.site === "(1) 總公司" &&
        item.subCategory === Iso14064SubCategory.UPSTREAM_TRANSPORT,
    );
    const zero = parsed.rows.find(
      (item) =>
        item.site === "(1) 總公司" &&
        item.subCategory === Iso14064SubCategory.INDUSTRIAL_PROCESS,
    );
    expect(ns?.state).toBe(ImportedQuantityStateEnum.NOT_SIGNIFICANT);
    expect(zero?.tonneCo2e).toBe("0");
  });

  it("三層勾稽全部通過", () => {
    const result = reconcileTable38(parsed, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    const failed = result.checks.filter((check) => !check.isWithinTolerance);
    expect(failed).toEqual([]);
    expect(result.isReconciled).toBe(true);
  });

  it("通過勾稽後寫入帳本(桑基圖的前置條件)", () => {
    const result = reconcileTable38(parsed, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    const ledger = toLedgerEntries(parsed, result, { tableNo: "表3.8" });
    expect(ledger.blockedReason).toBeNull();
    expect(ledger.entries.length).toBeGreaterThan(0);
  });
});

/**
 * Info: (20260803 - Tzuhan) 第三輪實測:模型改用 `**(1) 總公司**` 標示廠址。
 * `**` 因此進了廠址名,一路帶到對帳表與桑基節點上。排版不是內容。
 */
describe("markdown 強調標記不進資料", () => {
  const BOLD = `
| 報告邊界 | 類型 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) |
|---|---|---|---|
| **(1) 總公司** | | | |
| 類別一 | 1.1 固定式燃燒 | 0.4375 | 0.4375 |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | | 0.4375 | |
`.trim();

  it("廠址名不含 ** 標記", () => {
    const parsed = parseTable38(BOLD);
    const sites = Array.from(new Set(parsed.rows.map((row) => row.site)));
    expect(sites).toEqual(["(1) 總公司"]);
  });

  it("剝除標記後仍能完成勾稽", () => {
    const parsed = parseTable38(BOLD);
    expect(parsed.unparsedRows).toEqual([]);
    expect(reconcileTable38(parsed).isReconciled).toBe(true);
  });
});

/**
 * Info: (20260803 - Tzuhan) 三層桑基圖(Issue C)。驗的是圖的「語意」而非外觀:
 * 單位、層次、以及「沒畫的東西有沒有被說出來」。
 */
describe("匯入報告的分類切面圖(全公司 → 範疇 → 子代碼)", () => {
  const parsed = parseTable38(TABLE_38_LAYOUT_B);
  const reconciled = reconcileTable38(parsed, {
    companyTotalTonne: COMPANY_TOTAL,
  });
  const { entries } = toLedgerEntries(parsed, reconciled, { tableNo: "表3.8" });
  /**
   * Info: (20260803 - Tzuhan) 帶 formatEsgScope / formatScope —— 與 hook 的實際用法一致。
   * 不帶時圖上會印 SCOPE_1,那對查核者不可讀;
   * 純函數無從得知語言,顯示名只能由呼叫端注入。
   *
   * Info: (20260806 - Tzuhan) ISO 類別層已移除(它與範疇對類別一/二是 1:1,疊起來必然重疊),
   * 所以不再注入 formatIsoCategory。
   */
  const block = buildCarbonChartBlock(
    CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY,
    {
      entries,
      pending: [],
      scopeSubtotals: {},
      totalCo2eKg: "0",
      computedAt: new Date().toISOString(),
    },
    {
      ...CARBON_CHART_DEFAULT_LABELS,
      formatEsgScope: (scope: string) => formatEsgScopeLabel(scope, "zh_tw"),
      // Info: (20260806 - Tzuhan) 子代碼 ↔ GHG 類別的對照要用得上這個 formatter
      formatScope: (scope: string) => formatGhgCategoryLabel(scope, "zh_tw"),
      /**
       * Info: (20260807 - Tzuhan) 子代碼顯示名。不注入時圖上只有 `2.1`,
       * 而實測回報正是「尾端只有代碼,看不出流向哪裡」——
       * 測試要跟 hook 用同一組 labels,否則測到的是一個沒人在跑的組合。
       */
      formatSubCategory: (subCategory: string) =>
        formatIsoSubCategoryLabel(subCategory, "zh_tw"),
    },
  );

  // Info: (20260805 - Tzuhan) 取出 mermaid 的連結列:`"來源","目標",權重`
  const links = block
    .split("\n")
    .map((line) => line.trim().match(/^"(.+?)","(.+?)",([\d.]+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ from: m[1], to: m[2], weight: Number(m[3]) }));

  it("使用自己的錨點(與憑證桑基圖並存不互相覆蓋)", () => {
    expect(block).toContain("carbon-chart:IMPORTED_EMISSION_SANKEY:start");
    expect(block).not.toContain("carbon-chart:EMISSION_SANKEY:start");
  });

  /**
   * Info: (20260803 - Tzuhan) 單位必須是公噸,與原文表格一致。
   * 若印公斤(2814077.3),圖上的數字就與原文對不上,對帳的意義隨之消失。
   */
  it("數值為公噸,與原文表格逐格對得上", () => {
    /**
     * Info: (20260807 - Tzuhan) 原本斷言 `2814.0773`(屏東的範疇一小計)。
     * 抽掉廠址層之後圖上的節點都是三廠址合併後的值,那個數字不再單獨出現。
     *
     * 改為斷言**廠址小計清單裡的原文值** —— 8121.9184 是原文表3.8 的屏東小計,
     * 逐格對得上;而這也順便釘住「抽掉廠址層不等於廠址數字消失」。
     */
    expect(block).toContain("8121.9184");
    // Info: (20260803 - Tzuhan) 公斤值不得出現(差一千倍,對帳就失去意義)
    expect(block).not.toContain("2814077.3");
  });

  /**
   * Info: (20260806 - Tzuhan) 原斷言逐一檢查「範疇一」在不在。
   * 純傳遞節點摺疊後,範疇一 因為與類別一 同值而被摺掉(它什麼都沒說),
   * 所以改為檢查**層級鏈**存在:組織 → 廠址 → …… → 子代碼。
   */
  it("層級鏈俱在:全公司 → 範疇 → 子代碼(帶名稱)", () => {
    expect(links.some((l) => l.from === "全公司")).toBe(true);
    expect(links.some((l) => l.to.includes("範疇"))).toBe(true);
    /**
     * Info: (20260807 - Tzuhan) 末端節點要有**代碼 + 名稱**。
     * 只有代碼時讀者不知道 1.1 是什麼(實測回報),
     * 而只有名稱時無法回原文表格逐格對照 —— 兩者都要,順序也固定。
     */
    expect(links.some((l) => l.to === "1.1 固定式燃燒")).toBe(true);
  });

  /**
   * Info: (20260807 - Tzuhan) **廠址不再畫在圖上,但必須列得出來,而且逐廠址正確。**
   *
   * 這條斷言接的是一個實際存在、畫面上一直錯著的 bug:
   * 20260805 用「原文廠址名開頭的 `(n)`」當深層節點前綴,而這份報告的
   * 總公司與屏東分公司**都是 `(1)`** —— 前綴不唯一,第三層以下兩個廠址
   * 共用同一個節點,而**層間守恆的測試全部通過**(合併不改變總和)。
   *
   * 20260807 抽掉廠址層之後那個 bug 在圖上不可能再發生(沒有廠址節點),
   * 但風險換了地方:廠址資訊改由圖下的小計清單承擔 ——
   * 所以斷言也跟著換地方,改驗「清單裡三個廠址各自的量是對的」。
   * 這個 fixture 本身就帶著重複的 `(1)`,因此仍是同一個 bug 的回歸測試。
   */
  it("圖上沒有廠址節點,廠址改列小計清單且逐廠址分得開", () => {
    // Info: (20260807 - Tzuhan) `#n` 前綴那個 workaround 應該整個消失了
    links.forEach((l) => {
      expect(l.from).not.toMatch(/^#\d+/);
      expect(l.to).not.toMatch(/^#\d+/);
    });

    expect(block).toContain("各廠址小計");
    const siteRows = block
      .split("\n")
      .map((line) => line.match(/^- (.+?) ([\d.]+) \(([\d.]+)%\)$/))
      .filter((m): m is RegExpMatchArray => m !== null);

    // Info: (20260807 - Tzuhan) 三個廠址三列,名稱相異(重複的 `(1)` 已去掉,靠名稱本身分辨)
    expect(siteRows).toHaveLength(3);
    expect(new Set(siteRows.map((m) => m[1])).size).toBe(3);
    expect(siteRows.some((m) => m[1].includes("台北"))).toBe(true);
    expect(siteRows.some((m) => m[1].includes("屏東"))).toBe(true);

    // Info: (20260807 - Tzuhan) 各廠址加總 = 原文全公司總量(清單不套門檻,故完全相等)
    const listed = siteRows.reduce((sum, m) => sum + Number(m[2]), 0);
    expect(Math.abs(listed - Number(COMPANY_TOTAL))).toBeLessThanOrEqual(0.001);
    // Info: (20260807 - Tzuhan) 占比也要加起來是 100%(容差為小數一位的捨入)
    const shares = siteRows.reduce((sum, m) => sum + Number(m[3]), 0);
    expect(Math.abs(shares - 100)).toBeLessThanOrEqual(0.2);
  });

  /**
   * Info: (20260807 - Tzuhan) **同一個子代碼跨廠址合併後,要嘛整個畫、要嘛整個列在下面。**
   *
   * 這條是為一個我在 20260807 當天寫出來、又當天抓到的 bug 補的:
   * 抽掉廠址層之後,門檻仍逐筆套用 —— 台北分公司的 2.1 外購電力是 5.8344 公噸,
   * 低於門檻(總量的 0.1%,即 8.33),於是那一筆的邊被丟掉;
   * 而「未畫出」清單是以**合併後**的值算的,合併後的 2.1 是 3470.34,遠高於門檻,
   * 所以它不在清單裡。結果是「範疇二 3470.34 → 2.1 外購電力 3464.50」,
   * **差額 5.83 既沒畫出來、也沒被說出來**。
   *
   * 那正是這個模組再三聲明要避免的形狀:沒畫出來的東西必須說得出來。
   * 而它同樣通得過所有守恆測試 —— 因為少掉的量在最細層,而最細層本來就允許少。
   */
  it("同一子代碼合併後高於門檻就整個畫,不得只畫一部分", () => {
    const electricity = links.filter((l) => l.to === "2.1 外購電力");
    expect(electricity).toHaveLength(1);
    // Info: (20260807 - Tzuhan) 三個廠址的 2.1 相加(原文:3464.501 + 5.8344 + 0)
    expect(electricity[0].weight).toBeCloseTo(3470.3354, 3);
    // Info: (20260807 - Tzuhan) 而它既然畫了,就不該同時出現在「未畫出」清單裡
    const belowSection = (block.split("占比過小未畫出")[1] ?? "").split("**")[2] ?? "";
    expect(belowSection).not.toContain("2.1");
  });

  it("同一組節點對只出現一次且已加總(不賭渲染器會替我們合併)", () => {
    const pairs = links.map((l) => `${l.from}\u0000${l.to}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  /**
   * Info: (20260806 - Tzuhan) 守恆的斷言從「逐層」改為「逐節點」。
   *
   * 原本以標籤字樣切出「範疇層」「類別層」再比各層總和。
   * 20260806 起純傳遞節點會被摺疊(一入一出且同值 —— 例如
   * 範疇一 2831.93 → 類別一 2831.93,那個節點什麼都沒說卻讓標籤互相重疊),
   * 於是「層」不再是一個能用標籤切出來的東西:摺掉之後
   * 廠址會直接接到類別,而範疇三(真的分岔)仍然留著。
   *
   * 守恆本來就是**節點的性質**而不是層的性質,所以改成逐節點驗:
   * 流入必須等於流出,除非它的下游是最細的子代碼(那一層才套門檻)。
   * 這比原斷言更強,而且不因摺疊或層數變化而失效。
   */
  it("每個中間節點的流入等於流出(最細層例外,門檻只套那裡)", () => {
    const inflow = new Map<string, number>();
    const outflow = new Map<string, number>();
    links.forEach((l) => {
      inflow.set(l.to, (inflow.get(l.to) ?? 0) + l.weight);
      outflow.set(l.from, (outflow.get(l.from) ?? 0) + l.weight);
    });
    /**
     * Info: (20260807 - Tzuhan) 子代碼節點:標籤是「2.1 外購電力」——**代碼在開頭**。
     * 原本判定「尾端是 1.1」,而 20260807 補上名稱之後代碼移到前面,
     * 那個 regex 會一個都認不出來 → 這條斷言會變成永遠成立(等於沒測)。
     */
    const isSubCategory = (node: string): boolean => /^\d+(\.\d+)?\s/.test(node);

    const intermediates = Array.from(inflow.keys()).filter((node) =>
      outflow.has(node),
    );
    expect(intermediates.length).toBeGreaterThan(0);
    intermediates.forEach((node) => {
      const into = inflow.get(node) ?? 0;
      const outOf = outflow.get(node) ?? 0;
      // Info: (20260806 - Tzuhan) 不得憑空生出流量 —— 這條沒有例外
      expect(outOf).toBeLessThanOrEqual(into + 0.001);
      const feedsSubCategory = links.some(
        (l) => l.from === node && isSubCategory(l.to),
      );
      if (!feedsSubCategory) {
        expect(Math.abs(outOf - into)).toBeLessThan(0.001);
      }
    });
  });

  /**
   * Info: (20260805 - Tzuhan) 最細一層可以少 —— 差額就是低於門檻者,且已列在圖下方。
   * 這是刻意的不對稱:門檻只套最細層,否則小廠址的每一項都低於門檻,整個廠址會消失。
   */
  it("最細一層可低於上層,但差額不超過總量的 1%", () => {
    // Info: (20260807 - Tzuhan) 同上:代碼在標籤開頭
    const isSubCategory = (node: string): boolean => /^\d+(\.\d+)?\s/.test(node);
    const targets = new Set(links.map((l) => l.to));
    const organization = links
      .filter((l) => !targets.has(l.from))
      .reduce((s, l) => s + l.weight, 0);
    const subCategory = links
      .filter((l) => isSubCategory(l.to))
      .reduce((s, l) => s + l.weight, 0);
    expect(subCategory).toBeLessThanOrEqual(organization + 0.001);
    // Info: (20260805 - Tzuhan) 濾掉的是極細項,不該吃掉超過總量的 1%
    expect(subCategory).toBeGreaterThan(organization * 0.99);
  });

  /**
   * Info: (20260806 - Tzuhan) 純傳遞的範疇節點要被摺掉,真的分岔的要留著。
   *
   * 這份報告的 ISO 類別一/二 與範疇一/二 是一對一(定義上如此),
   * 於是那兩個範疇節點的進出數值完全相同、什麼都沒說,
   * 而 mermaid 把標籤畫在節點右側 —— 「(1) 範疇二 3464.5」直接疊在
   * 「(1) 類別二 3464.5」上,兩者都讀不出來。
   * 範疇三 → 類別三 + 類別四 真的分岔,那一個必須留。
   */
  it("純傳遞的範疇節點被摺掉,分岔的保留", () => {
    const scopeNodes = new Set(
      links.filter((l) => l.to.includes("範疇")).map((l) => l.to),
    );
    expect(scopeNodes.size).toBeGreaterThan(0);
    /**
     * Info: (20260807 - Tzuhan) 只有一個子代碼的範疇會被摺掉,全公司直接接子代碼。
     * 這份報告的範疇二只有 2.1 外購電力,所以「全公司 → 2.1 外購電力」必須存在:
     * 那個範疇節點一進一出且同值,留著只會讓標籤互相重疊。
     */
    const collapsedToSubCategory = links.filter(
      (l) => l.from === "全公司" && /^\d+(\.\d+)?\s/.test(l.to),
    );
    expect(collapsedToSubCategory.length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260807 - Tzuhan) 唯一的根是「全公司」,而且它不得被摺疊掉。
   *
   * 原本這張圖有三個根(三個廠址),而屏東佔 97% —— 另外兩個廠址在同一張圖上
   * 只能是髮絲級的細線,整張圖的比重讀不出來(實測回報)。
   *
   * 收成單一根之後多一個風險:若只剩一個範疇,「全公司 → 範疇一」是一進一出且同值,
   * 摺疊規則會把它吃掉,圖上就只剩子代碼、沒有總量。因此根節點列為受保護節點。
   */
  it("唯一的根是全公司(且不被摺疊規則吃掉)", () => {
    const targets = new Set(links.map((l) => l.to));
    const roots = new Set(
      links.map((l) => l.from).filter((n) => !targets.has(n)),
    );
    expect(Array.from(roots)).toEqual(["全公司"]);
  });

  /**
   * Info: (20260806 - Tzuhan) 各根節點流出加總 = 原文全公司總量。
   * 第一層不套門檻,所以是**完全相等**(容差同勾稽的 0.001 公噸)。
   */
  it("根節點流出加總等於原文全公司總量", () => {
    const targets = new Set(links.map((l) => l.to));
    const fromRoots = links
      .filter((l) => !targets.has(l.from))
      .reduce((s, l) => s + l.weight, 0);
    expect(Math.abs(fromRoots - Number(COMPANY_TOTAL))).toBeLessThanOrEqual(
      0.001,
    );
  });

  /**
   * Info: (20260806 - Tzuhan) GHG Protocol 類別不畫成一層(映射 1:1,那會是純傳遞節點),
   * 但它是一個分類判斷 —— 隱藏的判斷等於沒有依據,所以要在圖下方列出來。
   */
  it("子代碼與 GHG Protocol 類別的對照列在圖下方", () => {
    expect(block).toContain("子代碼與 GHG Protocol 類別的對照");
    /**
     * Info: (20260807 - Tzuhan) 左邊只放代碼:名稱已經在圖上的節點文字裡,
     * 兩邊都放會變成「3.1 上游運輸與配送 → 上游運輸與配送」的同語重複
     * (ISO 與 GHG Protocol 對這幾項的用詞剛好一樣),讀起來像 bug。
     */
    expect(block).toContain("3.1 → ");
  });

  // Info: (20260803 - Tzuhan) 零權重連結在 sankey 沒有意義;但不畫的必須說出來
  it("零與 NA/NS 不畫,且列在圖下方", () => {
    expect(block).toContain("未畫出的項目");
    expect(block).toContain("1.3");
  });

  /**
   * Info: (20260805 - Tzuhan) 低於門檻的也必須說出來,而且與 NA/NS 分開列 ——
   * 「沒有數字」與「數字太小」是不同的事實,只看圖都會被當成零。
   */
  it("低於門檻未畫出的另外列出", () => {
    expect(block).toContain("占比過小未畫出");
  });

  it("標題帶基準與單位(沒有單位的流量圖無從判讀量級)", () => {
    expect(block).toContain("所在地基準");
    expect(block).toContain("公噸 CO2e");
  });
});

/**
 * Info: (20260804 - Tzuhan) 併入匯入項目(mergeImportedLedgerEntries)。
 *
 * 這份合併規則原本在 hook 與建表兩處各寫一次。抽成純函數之後才測得到 ——
 * 而它守的三件事都是「錯了不會當場報錯,只會讓總量默默不對」的那種。
 */
/**
 * Info: (20260806 - Tzuhan) 排放去向圖:全公司 → 廠址 → 各廠址前九大項目 + 其他。
 *
 * 與分類切面拆成兩張的理由見 buildImportedSankey 的檔頭:
 * sankey 的每一層必須是上一層的細分,而範疇 → ISO 類別 對類別一/二是 1:1,
 * 1:1 的層必然讓標籤互相重疊。
 *
 * 這張圖用「名額」而不是「門檻」:名額給的是節點數上界,而門檻是相對值。
 * 門檻已經害過一次 —— 台北分公司總量占 0.11% 高於門檻,但它每一個單項都低於門檻,
 * 整個廠址從圖上消失。
 */
describe("匯入報告的排放去向圖(前九大 + 其他)", () => {
  const parsed = parseTable38(TABLE_38_LAYOUT_B);
  const reconciled = reconcileTable38(parsed, {
    companyTotalTonne: COMPANY_TOTAL,
  });
  const { entries } = toLedgerEntries(parsed, reconciled, { tableNo: "表3.8" });
  const block = buildCarbonChartBlock(
    CarbonChartTemplateEnum.IMPORTED_TOP_ITEMS_SANKEY,
    {
      entries,
      pending: [],
      scopeSubtotals: {},
      totalCo2eKg: "0",
      computedAt: new Date().toISOString(),
    },
    {
      ...CARBON_CHART_DEFAULT_LABELS,
      // Info: (20260807 - Tzuhan) 與 hook 同一組 labels:末端節點要有代碼 + 名稱
      formatSubCategory: (subCategory: string) =>
        formatIsoSubCategoryLabel(subCategory, "zh_tw"),
    },
  );
  const links = block
    .split("\n")
    .map((line) => line.trim().match(/^"(.+?)","(.+?)",([\d.]+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ from: m[1], to: m[2], weight: Number(m[3]) }));

  /**
   * Info: (20260807 - Tzuhan) 末端節點必須看得出「那是什麼」。
   *
   * 實測回報:「尾端只有代碼,看不出流向哪裡」—— 這張圖給查證人員與主管看,
   * 而 `2.1` 對他們不是資訊,要回頭翻表才知道是外購電力。
   * 代碼仍留在最前面:名稱是為了看得懂,代碼是為了回原文表格查得到。
   */
  it("末端節點帶代碼與標準名稱(代碼在前,可回原文對照)", () => {
    const biggest = links.find((l) => !l.to.startsWith("其他("));
    expect(biggest?.to).toBe("2.1 外購電力");
    // Info: (20260807 - Tzuhan) 不得只剩名稱 —— 那樣就回不去原文表3.8 了
    links
      .filter((l) => !l.to.startsWith("其他("))
      .forEach((l) => {
        expect(l.to).toMatch(/^\d+(\.\d+)?\s\S/);
      });
  });

  it("使用自己的錨點(與分類切面並存不互相覆蓋)", () => {
    expect(block).toContain("carbon-chart:IMPORTED_TOP_ITEMS_SANKEY:start");
    expect(block).not.toContain("carbon-chart:IMPORTED_EMISSION_SANKEY:start");
  });

  /**
   * Info: (20260806 - Tzuhan) 兩層,刻意沒有廠址層。
   *
   * 第一版做成 組織 → 廠址 → 逐廠址前九大,結果 28 個葉節點,
   * 而這份報告 97.5% 集中在一個廠址 —— 另外兩個廠址的項目全是看不見的細線,
   * 把比重稀釋掉,而比重正是這張圖唯一要回答的問題。
   * 廠址分布在分類切面那張圖的第一層就看得到。
   */
  it("兩層:全公司 → 項目(沒有廠址層)", () => {
    expect(links.every((l) => l.from === "全公司")).toBe(true);
    expect(links.some((l) => /^#\d+ /.test(l.to))).toBe(false);
    expect(links.length).toBeLessThanOrEqual(CARBON_SANKEY_TOP_ITEM_COUNT + 1);
  });

  /**
   * Info: (20260806 - Tzuhan) 這張圖**沒有門檻**,所以總量必須完全守恆:
   * 第一層加總 = 原文全公司總量,而且每個廠址的流出等於它的流入。
   * 「其他」是一個真的節點,那才是守恆成立的原因。
   */
  it("完全守恆:加總等於原文全公司總量", () => {
    const total = links.reduce((sum, l) => sum + l.weight, 0);
    expect(Math.abs(total - Number(COMPANY_TOTAL))).toBeLessThanOrEqual(0.001);
  });

  /**
   * Info: (20260806 - Tzuhan) 名額是逐廠址算的:全公司通吃的話,
   * 小廠址的項目永遠擠不進前九名,那個廠址就只會有一條「其他」——
   * 又回到「小廠址看不見」的老問題。
   */
  /**
   * Info: (20260806 - Tzuhan) 「其他」是一個真的節點,不是丟掉 —— 那才是守恆成立的原因。
   * 門檻制做不到:它只能把流量從圖上移除,再列在圖下方。
   */
  it("超出名額的併成一個真的「其他」節點", () => {
    const other = links.filter((l) => l.to.startsWith("其他("));
    expect(other).toHaveLength(1);
    expect(other[0].weight).toBeGreaterThan(0);
    // Info: (20260806 - Tzuhan) 前九大 + 其他 = 恰好十條
    expect(links).toHaveLength(CARBON_SANKEY_TOP_ITEM_COUNT + 1);
  });

  // Info: (20260806 - Tzuhan) 最大的項目排第一:這張圖的用途就是「哪一項最大」
  it("依排放量由大到小", () => {
    const items = links.filter((l) => !l.to.startsWith("其他("));
    const weights = items.map((l) => l.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  // Info: (20260806 - Tzuhan) 沒有門檻,所以「沒畫出來」只剩一個原因:原文根本沒有數字
  it("NA/NS 與為零者仍列在圖下方,但沒有「占比過小」那一段", () => {
    expect(block).toContain("未畫出的項目");
    expect(block).not.toContain("占比過小未畫出");
  });

  it("標題帶基準與單位", () => {
    expect(block).toContain("所在地基準");
    expect(block).toContain("公噸 CO2e");
  });
});

describe("匯入項目併入帳本", () => {
  const makeEntry = (
    activityKey: string,
    co2eKg: string,
    provenance?: LedgerProvenanceEnum,
  ): IComputedLedgerEntry => ({
    activityKey,
    scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
    sourceName: activityKey,
    quantityRaw: co2eKg,
    convertedQuantity: co2eKg,
    convertedUnit: MeasurementUnit.TONNE,
    co2eKg,
    factor: { factorId: "x", name: "x", value: "1", unit: "kg", source: "x" },
    ...(provenance ? { provenance } : {}),
  });

  const computed = makeEntry("voucher:1", "100");
  const imported = makeEntry(
    "imported:location:總公司:1.1",
    "500",
    LedgerProvenanceEnum.IMPORTED,
  );

  it("重複匯入同一筆是取代而非附加(總量不會翻倍)", () => {
    const once = mergeImportedLedgerEntries(undefined, [imported]);
    const twice = mergeImportedLedgerEntries(once, [imported]);
    expect(twice.entries).toHaveLength(1);
    expect(twice.totalCo2eKg).toBe("500");
  });

  it("憑證算出來的項目不因匯入而消失", () => {
    const base = mergeImportedLedgerEntries(undefined, [computed]);
    const merged = mergeImportedLedgerEntries(base, [imported]);
    expect(merged.entries.map((e) => e.activityKey)).toContain("voucher:1");
    expect(merged.totalCo2eKg).toBe("600");
  });

  it("小計與總計走同一份實作(明細加起來等於小計)", () => {
    const merged = mergeImportedLedgerEntries(undefined, [computed, imported]);
    const subtotalSum = Object.values(merged.scopeSubtotals).reduce(
      (sum, value) => sum + Number(value),
      0,
    );
    expect(subtotalSum).toBe(Number(merged.totalCo2eKg));
  });
});

/**
 * Info: (20260804 - Tzuhan) 缺表3.8 有兩種情形,不可混為一談。
 * 桑基圖與系統數據表格的唯一資料來源就是表3.8 —— 它沒進來的表現只是「少一張圖」,
 * 畫面上毫無異狀。那正是最需要被說出來的一種失敗。
 */
describe("缺少表3.8 的兩種情形", () => {
  const table = (tableNo: string): ICarbonSourceTable => ({
    tableNo,
    caption: tableNo,
    sourcePages: [40],
    markdown: "| a |\n| --- |\n| 1 |",
  });

  it("同節有表3.6 卻沒有表3.8:視為異常並產出說明", () => {
    const result = buildImportedLedger({ sourceTables: [table("表3.6")] });
    expect(result.missingLedgerTable).toBe(true);
    expect(result.disclosure).toContain("未取得表3.8");
    expect(result.entries).toEqual([]);
  });

  it("完全沒有全公司總量表:靜默略過(使用者可能只是沒勾選)", () => {
    const result = buildImportedLedger({ sourceTables: [table("表2.1")] });
    expect(result.missingLedgerTable).toBe(false);
    expect(result.disclosure).toBeNull();
  });

  it("有表3.8 時不觸發缺表判定", () => {
    const result = buildImportedLedger({
      sourceTables: [
        { ...table("表3.8"), markdown: TABLE_38 },
        { ...table("表3.6"), markdown: TABLE_38 },
      ],
    });
    expect(result.missingLedgerTable).toBe(false);
  });
});

/**
 * Info: (20260804 - Tzuhan) 儲存格內的 `<br>`(模型以它表示原文版面的折行)。
 *
 * 四個後果全是靜默的,其中廠址名污染與 stripEmphasis 修過的 `**(1) 總公司**` 同一類:
 * 錯的名字會一路帶進對帳表與桑基圖節點,而畫面上看起來像是資料本來就長那樣。
 */
describe("儲存格內的 <br>", () => {
  const TABLE_WITH_BR = `
| 公司 | 報告邊界類型 | 報告邊界 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) |
| --- | --- | --- | --- | --- |
| (1) 總公<br>司 | 類別一 | 1.<br>1 固定式燃燒 | 0.4375 | 17.8494 |
| (1) 總公司 | | 1.2 移動式燃燒 | 9.<br>0759 | |
`.trim();

  const parsedBr = parseTable38(TABLE_WITH_BR);

  it("廠址名不含 <br>(否則污染會帶進桑基圖節點)", () => {
    expect(parsedBr.rows.every((row) => !row.site.includes("<br>"))).toBe(true);
    expect(parsedBr.rows[0].site).toBe("(1) 總公司");
  });

  it("折行的子代碼仍對得上", () => {
    expect(parsedBr.rows[0].subCategory).toBe(
      Iso14064SubCategory.STATIONARY_COMBUSTION,
    );
  });

  it("折行的數字仍解得出來", () => {
    expect(parsedBr.rows[1].tonneCo2e).toBe("9.0759");
  });

  it("沒有讀不懂的資料列", () => {
    expect(parsedBr.unparsedRows).toEqual([]);
  });
});

/**
 * Info: (20260805 - Tzuhan) **第三種版面**(2026-08-05 實測):表3.8 被拆成三張子表格,
 * 每張前面一行**表格外的純文字廠址標籤**。
 *
 * 解析器原本只看含 `|` 的行,這種標籤整行被跳過 → currentSite 永遠是空的
 * → 72 列全部落進 unparsedRows → 廠址加總 0 → 勾稽失敗 → 不入帳 → 桑基圖不畫。
 * 三份 fixture 都要留:版面既然一輪換一次,任何一種隨時會回來。
 */
const TABLE_38_LAYOUT_C = `
**表3.8 各公司溫室氣體各類別排放量統計表**(原文照錄 p.42–44)

(1) 總公司

| 報告邊界 | 類型 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) |
|---|---|---|---|
| 類別一 | 1.1 固定式燃燒 | 0.4375 | 17.8494 |
| | 1.2 移動式燃燒 | 9.0759 | |
| | 1.3 產業過程 | 0.0000 | |
| | 1.4 人為系統/逸散 | 8.3360 | |
| | 1.5 土地使用與變更、 林業之排放與移除 | 0.0000 | |
| 類別二 | 2.1 外購電力 | 139.4858 | 139.4858 |
| | 2.2 外購能源 | 0.0000 | |
| 類別三 | 3.1 上游運輸 | NS | 16.2308 |
| | 3.2 下游運輸 | NS | |
| | 3.3 員工通勤 | 15.4379 | |
| | 3.4 客戶與訪客運輸 | NA | |
| | 3.5 業務旅運 | 0.7929 | |
| 類別四 | 4.1 採購貨物 | 27.8985 | 27.8985 |
| | 4.2 資本財 | NA | |
| | 4.3 固體或液體廢棄物 | NA | |
| | 4.4 資產使用 | NA | |
| | 4.5 服務使用 | NA | |
| 類別五 | 5.1 產品使用階段排放 或移除 | NA | NA |
| | 5.2 下游承租資產 | NA | |
| | 5.3 產品生命終止階段 | NA | |
| | 5.4 投資運作 | NA | |
| 類別六 | - | NA | NA |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | | 201.465 | |

(2) 台北分公司

| 報告邊界 | 類型 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) |
|---|---|---|---|
| 類別一 | 1.1 固定式燃燒 | 0.0000 | 1.5133 |
| | 1.2 移動式燃燒 | 1.1221 | |
| | 1.4 人為系統/逸散 | 0.3912 | |
| 類別二 | 2.1 外購電力 | 5.8344 | 5.8344 |
| 類別三 | 3.3 員工通勤 | 0.1887 | 0.6892 |
| | 3.5 業務旅運 | 0.5005 | |
| 類別四 | 4.1 採購貨物 | 1.1613 | 1.1613 |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | | 9.1982 | |

(1) 屏東分公司

| 報告邊界 | 類型 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) |
|---|---|---|---|
| 類別一 | 1.1 固定式燃燒 | 2591.8615 | 2814.0773 |
| | 1.2 移動式燃燒 | 13.2206 | |
| | 1.3 產業過程 | 189.0363 | |
| | 1.4 人為系統/逸散 | 19.9589 | |
| 類別二 | 2.1 外購電力 | 3325.0152 | 3325.0152 |
| 類別三 | 3.1 上游運輸 | 176.8211 | 1226.2346 |
| | 3.2 下游運輸 | 927.4575 | |
| | 3.3 員工通勤 | 118.8558 | |
| | 3.5 業務旅運 | 3.1002 | |
| 類別四 | 4.1 採購貨物 | 654.9068 | 756.5913 |
| | 4.3 固體或液體廢棄物 | 101.6845 | |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | | 8121.918 | |
`.trim();

describe("表3.8 第三種版面:廠址標籤在表格外", () => {
  const parsedC = parseTable38(TABLE_38_LAYOUT_C);

  it("沒有讀不懂的資料列", () => {
    expect(parsedC.unparsedRows).toEqual([]);
  });

  it("三個廠址都認得出來(標籤在表格外的純文字行)", () => {
    const sites = Array.from(new Set(parsedC.rows.map((row) => row.site)));
    expect(sites).toEqual(["(1) 總公司", "(2) 台北分公司", "(1) 屏東分公司"]);
  });

  /**
   * Info: (20260805 - Tzuhan) 表格標題含「各公司」,若沿用 isSiteCell 的「含公司」備援訊號
   * 就會把標題認成廠址。收緊到 (n) 前綴 + 短名 + 整行到此為止。
   */
  it("表格標題不會被認成廠址", () => {
    expect(parsedC.rows.every((row) => !row.site.includes("表3.8"))).toBe(true);
  });

  it("三層勾稽通過,總量對得上原文", () => {
    const reconciled = reconcileTable38(parsedC, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    // Info: (20260805 - Tzuhan) 判準是 isWithinTolerance,與 isReconciled 的組成一致
    const failed = reconciled.checks.filter(
      (check) => !check.isWithinTolerance,
    );
    expect(failed).toEqual([]);
    expect(reconciled.isReconciled).toBe(true);
  });

  it("入得了帳本(桑基圖的素材因此存在)", () => {
    const reconciled = reconcileTable38(parsedC, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    const { entries, blockedReason } = toLedgerEntries(parsedC, reconciled, {
      tableNo: "表3.8",
    });
    expect(blockedReason).toBeNull();
    expect(entries.length).toBeGreaterThan(0);
  });
});

/**
 * Info: (20260805 - Tzuhan) **第四種版面**(2026-08-05 test5 實測):
 * 廠址名成為表格內的粗體列,且開放類別(類別六)的「無細分項」獨立成一列。
 *
 * 這一輪的教訓不在解析,在**否決權的粒度**:
 * 勾稽 16 項全數通過(全公司 8332.5812 vs 原文 8332.581,差 0.0002),
 * 卻因為三列 `| - | NA | | |` 被記成未解析,整張表不予入帳 —— 桑基圖因此不畫。
 * 那三列是前一行類別標籤已記過的同一筆資訊,沒有新資料。
 */
const TABLE_38_LAYOUT_D = `
| 報告邊界 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) | 類型 |
| :--- | :--- | :--- | :--- |
| **(1) 總公司** | | | |
| 類別一 | | 17.8494 | |
| 1.1 固定式燃燒 | 0.4375 | | |
| 1.2 移動式燃燒 | 9.0759 | | |
| 1.3 產業過程 | 0.0000 | | |
| 1.4 人為系統/逸散 | 8.3360 | | |
| 1.5 土地使用與變更、 林業之排放與移除 | 0.0000 | | |
| 類別二 | | 139.4858 | |
| 2.1 外購電力 | 139.4858 | | |
| 2.2 外購能源 | 0.0000 | | |
| 類別三 | | 16.2308 | |
| 3.1 上游運輸 | NS | | |
| 3.2 下游運輸 | NS | | |
| 3.3 員工通勤 | 15.4379 | | |
| 3.4 客戶與訪客運輸 | NA | | |
| 3.5 業務旅運 | 0.7929 | | |
| 類別四 | | 27.8985 | |
| 4.1 採購貨物 | 27.8985 | | |
| 4.2 資本財 | NA | | |
| 4.3 固體或液體廢棄物 | NA | | |
| 4.4 資產使用 | NA | | |
| 4.5 服務使用 | NA | | |
| 類別五 | | NA | |
| 5.1 產品使用階段排放 或移除 | NA | | |
| 5.2 下游承租資產 | NA | | |
| 5.3 產品生命終止階段 | NA | | |
| 5.4 投資運作 | NA | | |
| 類別六 | | NA | |
| - | NA | | |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | 201.465 | | |
| 直接與間接溫室氣體總排放量-市場基準 (公噸 CO2e/年) | 201.465 | | |
| **(2) 台北分公司** | | | |
| 類別一 | | 1.5133 | |
| 1.1 固定式燃燒 | 0.0000 | | |
| 1.2 移動式燃燒 | 1.1221 | | |
| 1.4 人為系統/逸散 | 0.3912 | | |
| 類別二 | | 5.8344 | |
| 2.1 外購電力 | 5.8344 | | |
| 類別三 | | 0.6892 | |
| 3.3 員工通勤 | 0.1887 | | |
| 3.5 業務旅運 | 0.5005 | | |
| 類別四 | | 1.1613 | |
| 4.1 採購貨物 | 1.1613 | | |
| 類別六 | | NA | |
| - | NA | | |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | 9.1982 | | |
| **(3) 屏東分公司** | | | |
| 類別一 | | 2814.0773 | |
| 1.1 固定式燃燒 | 2591.8615 | | |
| 1.2 移動式燃燒 | 13.2206 | | |
| 1.3 產業過程 | 189.0363 | | |
| 1.4 人為系統/逸散 | 19.9589 | | |
| 類別二 | | 3325.0152 | |
| 2.1 外購電力 | 3325.0152 | | |
| 類別三 | | 1226.2346 | |
| 3.1 上游運輸 | 176.8211 | | |
| 3.2 下游運輸 | 927.4575 | | |
| 3.3 員工通勤 | 118.8558 | | |
| 3.5 業務旅運 | 3.1002 | | |
| 類別四 | | 756.5913 | |
| 4.1 採購貨物 | 654.9068 | | |
| 4.3 固體或液體廢棄物 | 101.6845 | | |
| 類別六 | | NA | |
| - | NA | | |
| 直接與間接溫室氣體總排放量-所在地基準 (公噸 CO2e/年) | 8121.918 | | |
`.trim();

describe("表3.8 第四種版面:開放類別的無細分項獨立成列", () => {
  const parsedD = parseTable38(TABLE_38_LAYOUT_D);

  it("`| - | NA | | |` 不算未解析(前一行類別標籤已記過)", () => {
    expect(parsedD.unparsedRows).toEqual([]);
  });

  it("粗體廠址列仍認得出廠址", () => {
    const sites = Array.from(new Set(parsedD.rows.map((row) => row.site)));
    expect(sites).toEqual(["(1) 總公司", "(2) 台北分公司", "(3) 屏東分公司"]);
  });

  it("類別六仍產出一筆 NA 的資料列(沒有被一起吃掉)", () => {
    const categorySix = parsedD.rows.filter(
      (row) => row.isoCategory === Iso14064Category.CATEGORY_6,
    );
    expect(categorySix).toHaveLength(3);
    expect(
      categorySix.every(
        (row) => row.state === ImportedQuantityStateEnum.NOT_APPLICABLE,
      ),
    ).toBe(true);
  });

  /**
   * Info: (20260805 - Tzuhan) 這一條是本輪真正的驗收:
   * 勾稽全通過**且**入得了帳本。先前 16 項全 ✓ 卻仍被三列未解析否決。
   */
  it("勾稽通過且入得了帳本(桑基圖因此有素材)", () => {
    const reconciled = reconcileTable38(parsedD, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    expect(reconciled.isReconciled).toBe(true);
    const { entries, blockedReason } = toLedgerEntries(parsedD, reconciled, {
      tableNo: "表3.8",
    });
    expect(blockedReason).toBeNull();
    expect(entries.length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260805 - Tzuhan) 放寬不等於放行:真正認不出子代碼的列仍須記成未解析。
   * 那道網是「少讀一列時小計與總計往往一起少,勾稽反而會通過」的唯一防線。
   */
  it("有數值但認不出主體的列仍記成未解析", () => {
    const tampered = parseTable38(
      TABLE_38_LAYOUT_D.replace(
        "| 1.1 固定式燃燒 | 0.4375 | | |",
        "| 某個看不懂的項目 | 0.4375 | | |",
      ),
    );
    expect(tampered.unparsedRows).toEqual([
      "| 某個看不懂的項目 | 0.4375 | | |",
    ]);
  });
});
