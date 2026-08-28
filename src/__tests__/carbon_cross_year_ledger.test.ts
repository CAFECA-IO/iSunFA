import { describe, it, expect } from "@jest/globals";
import {
  buildYearSnapshot,
  mergeImportedLedgerEntries,
} from "@/lib/carbon_ledger_totals";
import { buildImportedActivityKey } from "@/lib/carbon_table38.ledger";
import {
  EmissionBasisEnum,
  LedgerProvenanceEnum,
} from "@/constants/imported_quantity";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import type { IComputedLedgerEntry } from "@/types/carbon_chatbot.types";

/**
 * Info: (20260827 - Emily) 跨年度匯入不得留下孤兒列(PR #6725 review R1)。
 *
 * 去重鍵 `imported:{basis}:{site}:{subCategory}` **不含年度**,所以「以 key 取代」
 * 只換得掉兩年都有的排放源;**只有前一年有的**(關廠、廠址改名、
 * ISO 子類別編號改版)會留在帳本裡並被算進總量。
 *
 * reviewer 的實測:2023(總公司 1,000,000 + 舊廠 400,000)→
 * 2024(總公司 1,100,000 + 新廠 300,000),帳本總量印 1,800,000,
 * 而 2024 年的真值是 1,400,000 —— **虛增 28.6%,多出來的是一個 2024 年
 * 已經不存在的廠**。而它看起來完全正常:孤兒列每一筆都有合法溯源
 * (表3.8 + 廠址 + 子類別),單看帳本挑不出毛病。
 *
 * 觸發條件只要「兩年的廠址/子類別清單不完全相同」,那在真實盤查報告裡是常態。
 */

const BASIS = EmissionBasisEnum.LOCATION;

const importedEntry = (
  site: string,
  co2eKg: string,
  year?: number,
): IComputedLedgerEntry => {
  const subCategory = "2.1 外購電力";
  return {
    activityKey: buildImportedActivityKey(site, subCategory, BASIS),
    scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
    sourceName: `${site} ${subCategory}`,
    quantityRaw: co2eKg,
    convertedQuantity: co2eKg,
    convertedUnit: MeasurementUnit.TONNE,
    co2eKg,
    // Info: (20260827 - Emily) 形狀取自 toLedgerEntries 的真實產出(含 unit —— IFactorSnapshot 必填)
    factor: {
      factorId: "imported:3.8",
      name: "不適用(原文照錄)",
      value: "—",
      unit: MeasurementUnit.TONNE,
      source: "3.8",
    },
    provenance: LedgerProvenanceEnum.IMPORTED,
    emissionBasis: BASIS,
    importedOrigin: {
      site,
      isoCategory: Iso14064Category.CATEGORY_2,
      subCategory,
      tableNo: "3.8",
      ...(year !== undefined ? { year } : {}),
    },
  };
};

describe("跨年度匯入的帳本歸屬(PR #6725 review R1)", () => {
  const report2023 = [
    importedEntry("(1) 總公司", "1000000", 2023),
    importedEntry("(2) 舊廠", "400000", 2023),
  ];
  const report2024 = [
    importedEntry("(1) 總公司", "1100000", 2024),
    importedEntry("(3) 新廠", "300000", 2024),
  ];

  it("reviewer 的實測案例:2024 的總量是 1,400,000,不是 1,800,000", () => {
    const after2023 = mergeImportedLedgerEntries(undefined, report2023);
    expect(after2023.totalCo2eKg).toBe("1400000");

    const after2024 = mergeImportedLedgerEntries(after2023, report2024);
    expect(after2024.totalCo2eKg).toBe("1400000");
  });

  it("2024 年已不存在的廠不得留在帳本裡", () => {
    const after2023 = mergeImportedLedgerEntries(undefined, report2023);
    const after2024 = mergeImportedLedgerEntries(after2023, report2024);

    const sites = after2024.entries.map(
      (entry) => entry.importedOrigin?.site ?? entry.sourceName,
    );
    expect(sites).not.toContain("(2) 舊廠");
    expect(sites).toContain("(1) 總公司");
    expect(sites).toContain("(3) 新廠");
  });

  it("同年度重匯仍是覆蓋(不是附加),總量不變", () => {
    const once = mergeImportedLedgerEntries(undefined, report2024);
    const twice = mergeImportedLedgerEntries(once, report2024);

    expect(twice.totalCo2eKg).toBe(once.totalCo2eKg);
    expect(twice.entries).toHaveLength(once.entries.length);
  });

  /**
   * Info: (20260827 - Emily) 年度未知時**退回舊行為**,不憑猜替使用者決定歸屬 ——
   * 這一格的孤兒列風險由拒答說明處理(不再指示使用者去匯第二份報告),
   * 見 carbon_ledger_query.queryYearOverYear 的註解。
   */
  it("年度未知時不判年度(維持以 key 取代的舊行為)", () => {
    const noYear2023 = [
      importedEntry("(1) 總公司", "1000000"),
      importedEntry("(2) 舊廠", "400000"),
    ];
    const noYear2024 = [importedEntry("(1) 總公司", "1100000")];

    const merged = mergeImportedLedgerEntries(
      mergeImportedLedgerEntries(undefined, noYear2023),
      noYear2024,
    );
    expect(merged.totalCo2eKg).toBe("1500000");
  });

  it("COMPUTED 分錄不受跨年度剔除影響(憑證算出來的東西不因匯入而消失)", () => {
    const computed: IComputedLedgerEntry = {
      ...importedEntry("(9) 憑證來源", "50000", 2023),
      activityKey: "computed:fuel:diesel",
      provenance: LedgerProvenanceEnum.COMPUTED,
      importedOrigin: undefined,
    };
    const base = mergeImportedLedgerEntries(undefined, [
      ...report2023,
      computed,
    ]);
    const after = mergeImportedLedgerEntries(base, report2024);

    expect(
      after.entries.some(
        (entry) => entry.activityKey === "computed:fuel:diesel",
      ),
    ).toBe(true);
    expect(after.totalCo2eKg).toBe("1450000");
  });
});

describe("年度快照存那份報告的分錄(review R1 第二項)", () => {
  it("快照的總量等於那份報告自己的總量,不含其他年度", () => {
    const snapshot = buildYearSnapshot([
      importedEntry("(1) 總公司", "1000000", 2023),
      importedEntry("(2) 舊廠", "400000", 2023),
    ]);

    expect(snapshot.totalCo2eKg).toBe("1400000");
    expect(snapshot.entries).toHaveLength(2);
  });

  /**
   * Info: (20260827 - Emily) 存累積後的帳本會讓「2023 的快照」含 2024 的分錄,
   * 年間比較於是拿自己跟自己比 —— 那正是這個欄位存在的理由被抵銷掉的方式。
   */
  it("待補項不進快照(待補是當前帳本的狀態,不是某一年的歷史事實)", () => {
    const snapshot = buildYearSnapshot([
      importedEntry("(1) 總公司", "1000000", 2023),
    ]);
    expect(snapshot.pending).toEqual([]);
  });
});
