// Info: (20260803 - Tzuhan) 表3.8 解析與三層勾稽(Issue B 第 1~3 點)
// Info: (20260803 - Tzuhan) fixture 直接取自 2026-08-03 實測落地的原文表格(高興昌 2023 盤查報告 p.42–44),
// Info: (20260803 - Tzuhan) 不自造資料:自造的表格不會有合併儲存格攤平、千分位逗號、NA/NS 混排這些真實形狀,
// Info: (20260803 - Tzuhan) 而那三件事正是解析最容易錯的地方。

import { describe, it, expect } from "@jest/globals";
import { parseTable38 } from "@/lib/carbon_table38.parser";
import {
  listExcludedEntries,
  ReconciliationLevelEnum,
  reconcileTable38,
} from "@/lib/carbon_table38.reconciliation";
import { toLedgerEntries } from "@/lib/carbon_table38.ledger";
import { buildReconciliationDisclosure } from "@/lib/carbon_table38.disclosure";
import { buildCarbonDataTable } from "@/lib/carbon_report_table.builder";
import {
  EmissionBasisEnum,
  ImportedQuantityStateEnum,
  LedgerProvenanceEnum,
} from "@/constants/imported_quantity";
import { Iso14064SubCategory } from "@/constants/iso14064_subcategory";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";

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
 * Info: (20260803 - Tzuhan) 「兩者並存但絕不合併」的執行面:
 * 匯入項目進 ledger(桑基圖需要),但不得出現在系統計算表格裡 ——
 * 否則同一組數字會在一節內出現兩遍,一遍標原文、一遍看起來像本系統算的。
 */
describe("匯入項目不進系統計算表格", () => {
  it("ledger 只有匯入項目時,系統表格仍顯示資料不足", () => {
    const parsed = parseTable38(TABLE_38);
    const reconciled = reconcileTable38(parsed, {
      companyTotalTonne: COMPANY_TOTAL,
    });
    const { entries } = toLedgerEntries(parsed, reconciled, {
      tableNo: "表3.8",
    });
    const block = buildCarbonDataTable({
      entries,
      pending: [],
      scopeSubtotals: {},
      totalCo2eKg: "0",
      computedAt: new Date().toISOString(),
    });
    expect(block).not.toContain("2,591,861.5");
    expect(block).toContain("carbon-data-table:start");
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
