// Info: (20260825 - Emily) 帳本確定性查詢層的測試(#6707 第一層)。
// Info: (20260825 - Emily) 形狀取自 run G 的真實帳本(高興昌三廠址),數字縮小以便肉眼驗算。

import fs from "fs";
import path from "path";
import {
  queryTotal,
  queryTopEmitters,
  querySiteSubtotals,
  queryIsoCategorySubtotals,
  queryAnomalies,
  queryYearOverYear,
  toContextFacts,
  buildLedgerFactBundle,
  LedgerRefusalReasonEnum,
  LEDGER_FACT_BUNDLE_MAX,
  LEDGER_FACT_SITES_MAX,
} from "@/lib/carbon_ledger_query";
import {
  GhgProtocolCategory,
  Iso14064Category,
  GhgCategoryDetails,
} from "@/constants/esg";
import { MoneyUtil } from "@/lib/utils/money";
import {
  collectAllowedNumbers,
  adjudicateQuantityClaims,
  extractQuantityClaims,
} from "@/lib/carbon_reply_gate";
import {
  EmissionBasisEnum,
  LedgerProvenanceEnum,
} from "@/constants/imported_quantity";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
import type {
  IComputedLedger,
  IComputedLedgerEntry,
} from "@/types/carbon_chatbot.types";

const importedEntry = (
  overrides: Partial<IComputedLedgerEntry> & {
    activityKey: string;
    co2eKg: string;
  },
): IComputedLedgerEntry => ({
  scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
  sourceName: "總公司 外購電力",
  quantityRaw: "0",
  convertedQuantity: "0",
  convertedUnit: "TONNE",
  factor: {
    factorId: "imported:3.8",
    name: "不適用(原文照錄)",
    value: "—",
    unit: "TONNE",
    source: "3.8",
  },
  provenance: LedgerProvenanceEnum.IMPORTED,
  emissionBasis: EmissionBasisEnum.LOCATION,
  importedOrigin: {
    site: "(1) 總公司",
    isoCategory: Iso14064Category.CATEGORY_2,
    subCategory: "2.1 外購電力",
    tableNo: "3.8",
  },
  ...overrides,
});

const ledgerOf = (
  entries: IComputedLedgerEntry[],
  extra?: Partial<IComputedLedger>,
): IComputedLedger => ({
  entries,
  pending: [],
  scopeSubtotals: { SCOPE_2_INDIRECT: "999" },
  totalCo2eKg: "999",
  computedAt: "2026-08-25T00:00:00.000Z",
  ...extra,
});

describe("queryTotal", () => {
  it("讀既存的總計欄位,不重算(單一累加實作原則)", () => {
    /**
     * Info: (20260825 - Emily) 分錄實際加總是 3,但欄位存 999 ——
     * 若查詢層自己累加,這條會回 3。斷言 999 = 證明它讀欄位。
     * 欄位由 summarizeLedgerEntries 寫入是別人的測試在守,不在這裡重驗。
     */
    const ledger = ledgerOf([
      importedEntry({ activityKey: "a", co2eKg: "1" }),
      importedEntry({ activityKey: "b", co2eKg: "2" }),
    ]);
    const result = queryTotal(ledger);
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts[0].value).toBe("999 kgCO2e");
    expect(result.facts[0].source).toContain("2 筆分錄");
    /*
     * Info: (20260908 - Emily) 範疇二只有一個 GHG 類別鍵 → 只印「範疇二合計」那一筆,
     * 不再印 `[SCOPE_2_INDIRECT] 小計`:enum 鍵不進人話(owner 9/08 判定),
     * 而同一個數字印兩筆會讓模型以為是兩件事。label 帶兩套術語的對照。
     */
    expect(result.facts[1]).toEqual({
      label: "範疇二合計(GHG Protocol 能源間接排放;對應 ISO 14064-1 類別二)",
      value: "999 kgCO2e",
      source: "帳本範疇小計欄",
      // Info: (20260827 - Emily) 排放量本體另以結構標記,供出口守門裁決(見 IContextFact.emissionsKg)
      emissionsKg: ["999"],
    });
    expect(result.facts).toHaveLength(2);
  });

  describe("範疇合計(#6778 第三半:owner 9/08 問「範疇三」答不出單一數字)", () => {
    const scope3Ledger = () =>
      ledgerOf([importedEntry({ activityKey: "a", co2eKg: "1" })], {
        scopeSubtotals: {
          SCOPE_1_DIRECT: "100",
          SCOPE_3_CAT_1: "683966.6",
          SCOPE_3_CAT_4: "176821.1",
          SCOPE_3_CAT_9: "927457.5",
        },
        totalCo2eKg: "1788345.2",
      });

    it("範疇三合計 = 各 GHG 類別小計以 MoneyUtil 加總,且排在它的組成之前", () => {
      const result = queryTotal(scope3Ledger());
      if (!result.ok) throw new Error("should be ok");
      const labels = result.facts.map((fact) => fact.label);
      const rollupIndex = labels.findIndex((label) =>
        label.startsWith("範疇三合計"),
      );
      expect(rollupIndex).toBeGreaterThan(-1);
      expect(result.facts[rollupIndex].value).toBe("1788245.2 kgCO2e");
      expect(result.facts[rollupIndex].emissionsKg).toEqual(["1788245.2"]);
      expect(result.facts[rollupIndex].source).toContain("3 個 GHG 類別");
      // Info: (20260908 - Emily) 先給答案,再給組成
      expect(labels[rollupIndex + 1]).toBe("範疇三:購買的商品與服務 小計");
    });

    it("★ 三個範疇合計相加 = 帳本總計欄(在查詢層加總的代價擔保)", () => {
      const result = queryTotal(scope3Ledger());
      if (!result.ok) throw new Error("should be ok");
      const sum = result.facts
        .filter((fact) => /^範疇[一二三]合計/.test(fact.label))
        .reduce((acc, fact) => MoneyUtil.add(acc, fact.emissionsKg![0]), "0");
      expect(sum).toBe("1788345.2");
    });

    it("label 上寫著兩套術語的對照,但不含阿拉伯數字", () => {
      /**
       * Info: (20260908 - Emily) 對照是橋(範疇三 ↔ 類別三、四、五、六);不寫「Scope 3」——
       * label 不進守門的合法集合,但模型會照抄 label,一個裸露的 3 落在排放單位旁就是假主張。
       */
      const result = queryTotal(scope3Ledger());
      if (!result.ok) throw new Error("should be ok");
      const rollups = result.facts.filter((fact) =>
        /^範疇[一二三]合計/.test(fact.label),
      );
      expect(rollups).toHaveLength(2);
      rollups.forEach((fact) => {
        expect(fact.label).toMatch(/ISO 14064-1 類別/);
        expect(fact.label.replace(/14064-1/, "")).not.toMatch(/[0-9]/);
      });
      expect(rollups[1].label).toContain("類別三、四、五、六");
    });

    it("範疇三的各類別前面補「範疇三:」,而且不寫「類別 n」(與 ISO 的「類別」同字不同義)", () => {
      const result = queryTotal(scope3Ledger());
      if (!result.ok) throw new Error("should be ok");
      const members = result.facts.filter((fact) =>
        fact.label.startsWith("範疇三:"),
      );
      expect(members.map((fact) => fact.label)).toEqual([
        "範疇三:購買的商品與服務 小計",
        "範疇三:上游運輸與配送 小計",
        "範疇三:下游運輸與配送 小計",
      ]);
      members.forEach((fact) => expect(fact.label).not.toMatch(/類別 ?[0-9]/));
    });
  });

  it("帳本空(undefined 或零分錄)→ 拒答並說出缺什麼", () => {
    const absent = queryTotal(undefined);
    if (absent.ok) throw new Error("should refuse");
    expect(absent.refusal.reason).toBe(LedgerRefusalReasonEnum.LEDGER_EMPTY);
    expect(absent.refusal.missing).toContain("匯入");

    const empty = queryTotal(ledgerOf([]));
    if (empty.ok) throw new Error("should refuse");
    expect(empty.refusal.reason).toBe(LedgerRefusalReasonEnum.LEDGER_EMPTY);
  });
});

describe("queryTopEmitters", () => {
  it("以 decimal 比較排序,超過 2^53 的整數字串不因浮點失真而並列", () => {
    /**
     * Info: (20260825 - Emily) parseFloat("9007199254740993") === parseFloat("9007199254740992")
     * —— 浮點在 2^53 之上分不出這兩個數;decimal 比較必須分得出來。
     */
    const ledger = ledgerOf([
      importedEntry({ activityKey: "small", co2eKg: "9007199254740992" }),
      importedEntry({ activityKey: "big", co2eKg: "9007199254740993" }),
    ]);
    const result = queryTopEmitters(ledger, 2);
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts[0].value).toContain("9007199254740993");
    expect(result.facts[1].value).toContain("9007199254740992");
  });

  it("同值以 activityKey 決勝:同一份帳本兩次問答不得換答案", () => {
    const ledger = ledgerOf([
      importedEntry({
        activityKey: "z-later",
        co2eKg: "10",
        sourceName: "來源Z",
      }),
      importedEntry({
        activityKey: "a-first",
        co2eKg: "10",
        sourceName: "來源A",
      }),
    ]);
    const result = queryTopEmitters(ledger, 1);
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts[0].label).toBe("排放量第 1 大:來源A");
    const again = queryTopEmitters(ledger, 1);
    expect(again).toEqual(result);
  });

  it("每一筆都帶溯源:匯入項說得出表號與廠址", () => {
    const ledger = ledgerOf([importedEntry({ activityKey: "a", co2eKg: "5" })]);
    const result = queryTopEmitters(ledger, 1);
    if (!result.ok) throw new Error("should be ok");
    /*
     * Info: (20260907 - Emily) #6778 起溯源字串多帶 ISO 類別:
     * 前五大是使用者最常追問「這筆屬於哪一類」的地方,而類別就在同一筆分錄上。
     */
    expect(result.facts[0].source).toBe(
      "原文照錄 表3.8 (1) 總公司 2.1 外購電力(類別二)",
    );
  });

  it("占比由查詢層決定性算出(Decimal 一位小數),不留給 LLM 自己算", () => {
    /**
     * Info: (20260825 - Emily) 08-25 實測:事實包沒給占比,LLM 就自己算了 39.9% ——
     * persona 禁計算擋不住。399/1000 = 39.9%:給了值,它就沒理由算。
     * 總計欄位為 0 時不給占比(除以零),值裡不得出現 %。
     */
    const ledger = ledgerOf(
      [importedEntry({ activityKey: "a", co2eKg: "399" })],
      { totalCo2eKg: "1000" },
    );
    const result = queryTopEmitters(ledger, 1);
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts[0].value).toContain("占全公司總量 39.9%");

    const zeroTotal = queryTopEmitters(
      ledgerOf([importedEntry({ activityKey: "a", co2eKg: "399" })], {
        totalCo2eKg: "0",
      }),
      1,
    );
    if (!zeroTotal.ok) throw new Error("should be ok");
    expect(zeroTotal.facts[0].value).not.toContain("%");
  });
});

describe("querySiteSubtotals", () => {
  it("按廠址加總(MoneyUtil):0.1 + 0.2 = 0.3,不是 0.30000000000000004", () => {
    const ledger = ledgerOf([
      importedEntry({ activityKey: "a", co2eKg: "0.1" }),
      importedEntry({ activityKey: "b", co2eKg: "0.2" }),
      importedEntry({
        activityKey: "c",
        co2eKg: "7",
        importedOrigin: {
          site: "(2) 台北分公司",
          isoCategory: Iso14064Category.CATEGORY_2,
          subCategory: "2.1 外購電力",
          tableNo: "3.8",
        },
      }),
    ]);
    const result = querySiteSubtotals(ledger);
    if (!result.ok) throw new Error("should be ok");
    /*
     * Info: (20260909 - Emily) 排序由「插入順序」改成「排放量由大到小」(#6783 review 低-2):
     * 廠址小計是 core 裡唯一沒有上界的一組,要裁就得先知道哪幾個最大。
     * 所以台北分公司(7)排在總公司(0.3)之前。
     */
    expect(result.facts).toEqual([
      {
        label: "(2) 台北分公司 排放小計",
        value: "7 kgCO2e",
        source: "原文照錄 表3.8 分錄加總",
        emissionsKg: ["7"],
      },
      {
        label: "(1) 總公司 排放小計",
        value: "0.3 kgCO2e",
        source: "原文照錄 表3.8 分錄加總",
        emissionsKg: ["0.3"],
      },
    ]);
  });

  it("tableNo 已帶「表」(上游正規化後的實際值)時不得印成「表表3.8」", () => {
    /**
     * Info: (20260908 - Emily) `normalizeSourceTableNo` 的輸出是「表3.8」,而查詢層原本再串一個「表」。
     * owner 9/08 的截圖裡「原文照錄 表表3.8 分錄按 ISO 類別加總(MoneyUtil)」就是這兩個 bug 疊在一起。
     * 夾具預設用「3.8」是歷史包袱,所以這裡特別用實際值。
     */
    const ledger = ledgerOf([
      importedEntry({
        activityKey: "a",
        co2eKg: "1",
        importedOrigin: {
          site: "(1) 總公司",
          isoCategory: Iso14064Category.CATEGORY_2,
          subCategory: "2.1 外購電力",
          tableNo: "表3.8",
        },
      }),
    ]);
    const sites = querySiteSubtotals(ledger);
    const iso = queryIsoCategorySubtotals(ledger);
    const top = queryTopEmitters(ledger, 1);
    [sites, iso, top].forEach((result) => {
      if (!result.ok) throw new Error("should be ok");
      result.facts.forEach((fact) => {
        expect(fact.source).toContain("表3.8");
        expect(fact.source).not.toContain("表表");
      });
    });
  });

  describe("廠址數量的上界(#6783 review 低-2)", () => {
    const manySites = (count: number) =>
      ledgerOf(
        Array.from({ length: count }, (_, index) =>
          importedEntry({
            activityKey: `k${index}`,
            // Info: (20260909 - Emily) 遞增,所以「前 12 大」是可預測的那 12 個
            co2eKg: String(index + 1),
            importedOrigin: {
              site: `(${index}) 廠址${index}`,
              isoCategory: Iso14064Category.CATEGORY_1,
              subCategory: "1.1 柴油",
              tableNo: "3.8",
            },
          }),
        ),
        {
          totalCo2eKg: MoneyUtil.sum(
            Array.from({ length: count }, (_, index) => String(index + 1)),
          ),
        },
      );

    it(`不超過 ${LEDGER_FACT_SITES_MAX} 個廠址時全部列出,沒有「另有」那一筆`, () => {
      const result = querySiteSubtotals(manySites(LEDGER_FACT_SITES_MAX));
      if (!result.ok) throw new Error("should be ok");
      expect(result.facts).toHaveLength(LEDGER_FACT_SITES_MAX);
      expect(result.facts.some((fact) => fact.label.startsWith("另有"))).toBe(
        false,
      );
    });

    it("超過時只列前 N 大,其餘併成一筆,總筆數固定", () => {
      const result = querySiteSubtotals(manySites(40));
      if (!result.ok) throw new Error("should be ok");
      expect(result.facts).toHaveLength(LEDGER_FACT_SITES_MAX + 1);
      // Info: (20260909 - Emily) 遞增排放 → 最大的是最後一個廠址
      expect(result.facts[0].label).toBe("(39) 廠址39 排放小計");
      expect(result.facts[LEDGER_FACT_SITES_MAX].label).toBe(
        `另有 ${40 - LEDGER_FACT_SITES_MAX} 個廠址 排放小計`,
      );
    });

    it("列出的 + 另有的 = 全部廠址小計之和(省略不提會讓查核者加不回總量)", () => {
      const ledger = manySites(40);
      const result = querySiteSubtotals(ledger);
      if (!result.ok) throw new Error("should be ok");
      const sum = result.facts.reduce(
        (acc, fact) => MoneyUtil.add(acc, fact.emissionsKg![0]),
        "0",
      );
      expect(sum).toBe(ledger.totalCo2eKg);
    });

    it("同額廠址以名稱決勝(決定性:同一份帳本兩次問答不得換順序)", () => {
      const tie = ledgerOf(
        ["丙廠", "甲廠", "乙廠"].map((site, index) =>
          importedEntry({
            activityKey: `k${index}`,
            co2eKg: "5",
            importedOrigin: {
              site,
              isoCategory: Iso14064Category.CATEGORY_1,
              subCategory: "1.1 柴油",
              tableNo: "3.8",
            },
          }),
        ),
        { totalCo2eKg: "15" },
      );
      const first = querySiteSubtotals(tie);
      const second = querySiteSubtotals(tie);
      if (!first.ok || !second.ok) throw new Error("should be ok");
      expect(first.facts.map((fact) => fact.label)).toEqual(
        second.facts.map((fact) => fact.label),
      );
      expect(first.facts.map((fact) => fact.label)).toEqual([
        "丙廠 排放小計",
        "乙廠 排放小計",
        "甲廠 排放小計",
      ]);
    });
  });

  it("帳本只有憑證分錄(無廠址維度)→ 拒答說明是維度缺席,不是排放量為零", () => {
    const computedOnly = ledgerOf([
      importedEntry({
        activityKey: "voucher",
        co2eKg: "5",
        provenance: undefined,
        importedOrigin: undefined,
      }),
    ]);
    const result = querySiteSubtotals(computedOnly);
    if (result.ok) throw new Error("should refuse");
    expect(result.refusal.reason).toBe(
      LedgerRefusalReasonEnum.DIMENSION_ABSENT,
    );
    expect(result.refusal.missing).toContain("廠址");
  });
});

describe("queryIsoCategorySubtotals(#6778)", () => {
  /**
   * Info: (20260907 - Emily) 這一組的中心判準只有一條:
   * **「類別三」與「範疇三」必須同時在事實包裡,而且值不同。**
   *
   * ISO 類別三只有運輸;GHG 範疇三是 ISO 類別三+四+五+六。
   * 事實包原本只有範疇小計 —— 使用者問「ISO 14064 類別三多少」時,
   * 守規矩的模型拒答、不守規矩的拿範疇三充當答案。
   * 兩者值相同的測資驗不出這件事,所以下面的帳本刻意讓它們差開。
   */
  const transportEntry = importedEntry({
    activityKey: "transport",
    co2eKg: "3",
    scopeCategory: GhgProtocolCategory.SCOPE_3_CAT_4,
    sourceName: "(1) 總公司 上游運輸",
    importedOrigin: {
      site: "(1) 總公司",
      isoCategory: Iso14064Category.CATEGORY_3,
      subCategory: "3.1 上游運輸",
      tableNo: "3.8",
    },
  });
  const productEntry = importedEntry({
    activityKey: "product",
    co2eKg: "4",
    scopeCategory: GhgProtocolCategory.SCOPE_3_CAT_1,
    sourceName: "(1) 總公司 外購原料",
    importedOrigin: {
      site: "(1) 總公司",
      isoCategory: Iso14064Category.CATEGORY_4,
      subCategory: "4.1 外購原料",
      tableNo: "3.8",
    },
  });

  it("類別三與範疇三同時存在,而且值不同(類別三 3 ≠ 範疇三 7)", () => {
    const ledger = ledgerOf([transportEntry, productEntry], {
      // Info: (20260907 - Emily) 範疇小計是既存欄位(summarizeLedgerEntries 寫入),此處比照其輸出
      scopeSubtotals: { SCOPE_3_CAT_4: "7" },
      totalCo2eKg: "7",
    });
    const bundle = buildLedgerFactBundle(ledger);
    const byLabel = new Map(bundle.map((fact) => [fact.label, fact.value]));

    const isoThree = [...byLabel.entries()].find(([label]) =>
      label.startsWith("類別三"),
    );
    const scopeThree = [...byLabel.entries()].find(([label]) =>
      label.startsWith("範疇三合計"),
    );
    expect(isoThree?.[1]).toBe("3 kgCO2e");
    expect(scopeThree?.[1]).toBe("7 kgCO2e");
    expect(isoThree?.[1]).not.toBe(scopeThree?.[1]);
  });

  it("各類別小計 + 未標註 = 帳本總量,而且是 MoneyUtil 的加法不是浮點的(#6783 低-1)", () => {
    /**
     * Info: (20260907 - Emily) 這一條是「在查詢層加總」這個決定的代價擔保。
     * 類別小計不是既存欄位(見該函式的註解),所以這裡確實做了加法;
     * 只要它與寫入 totalCo2eKg 的那份實作不一致,這一條就紅。
     *
     * Info: (20260909 - Emily) 夾具改成**浮點會裂**的真實量級(#6783 review 低-1)。
     *
     * 原本餵的是 `3` / `4` / `1.5` —— 全都是二進位可精確表示的值,於是把
     * `MoneyUtil.add` 換成原生浮點加法,這一條(以及全部 55 條)照樣全綠,
     * 而函式註解卻寫著「加法只要與 summarizeLedgerEntries 不一致,那條就會紅」。
     * 檔頭「數字縮小以便肉眼驗算」的代價,正好是唯一驗不出精度缺陷的那一組數字(§1.4)。
     *
     * 現在用表 38 的真實量級,而且**同一個類別放兩筆** —— 單筆與 `"0"` 相加不會裂,
     * 裂的是累加:
     *
     *     647726.8 + 330645.9 → 浮點 978372.7000000001 / 正確 978372.7
     *     408705.1 + 418371.3 → 浮點 827076.3999999999 / 正確 827076.4
     *
     * 兩個累加器(類別的 Map、未標註那桶的 reduce)各拿一組,任一支退回浮點都會紅。
     */
    const inCategory = (key: string, co2eKg: string) =>
      importedEntry({
        activityKey: key,
        co2eKg,
        scopeCategory: GhgProtocolCategory.SCOPE_3_CAT_4,
        importedOrigin: {
          site: "(1) 總公司",
          isoCategory: Iso14064Category.CATEGORY_3,
          subCategory: "3.1 上游運輸",
          tableNo: "3.8",
        },
      });
    const voucher = (key: string, co2eKg: string) =>
      importedEntry({
        activityKey: key,
        co2eKg,
        provenance: undefined,
        importedOrigin: undefined,
      });
    const ledger = ledgerOf(
      [
        inCategory("t1", "647726.8"),
        inCategory("t2", "330645.9"),
        voucher("v1", "408705.1"),
        voucher("v2", "418371.3"),
      ],
      { totalCo2eKg: "1805449.1" },
    );
    const result = queryIsoCategorySubtotals(ledger);
    if (!result.ok) throw new Error("should be ok");
    // Info: (20260909 - Emily) 印出去的值本身就要對 —— 它同時是守門的合法數字
    expect(result.facts[0].value).toBe("978372.7 kgCO2e");
    expect(result.facts[0].emissionsKg).toEqual(["978372.7"]);
    const uncategorized = result.facts.find((fact) =>
      fact.label.startsWith("未標註 ISO 類別"),
    );
    expect(uncategorized?.emissionsKg).toEqual(["827076.4"]);
    const sum = result.facts.reduce(
      (acc, fact) => MoneyUtil.add(acc, fact.emissionsKg![0]),
      "0",
    );
    expect(sum).toBe(ledger.totalCo2eKg);
  });

  it("憑證來源(無 isoCategory)自成一桶,不併進任何類別", () => {
    const voucherEntry = importedEntry({
      activityKey: "voucher",
      co2eKg: "1.5",
      provenance: undefined,
      importedOrigin: undefined,
    });
    const result = queryIsoCategorySubtotals(
      ledgerOf([transportEntry, voucherEntry], { totalCo2eKg: "4.5" }),
    );
    if (!result.ok) throw new Error("should be ok");
    const labels = result.facts.map((fact) => fact.label);
    expect(labels).toEqual([
      "類別三 排放小計(ISO 14064-1)",
      "未標註 ISO 類別 排放小計",
    ]);
    const isoThree = result.facts[0];
    expect(isoThree.value).toBe("3 kgCO2e");
    expect(result.facts[1].source).toContain("無原文類別");
  });

  it("輸出順序照類別編號,不照分錄出現順序(同一份帳本兩次問答不得換順序)", () => {
    const ledger = ledgerOf([productEntry, transportEntry], {
      totalCo2eKg: "7",
    });
    const result = queryIsoCategorySubtotals(ledger);
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts.map((fact) => fact.label)).toEqual([
      "類別三 排放小計(ISO 14064-1)",
      "類別四 排放小計(ISO 14064-1)",
    ]);
  });

  it("帳本只有憑證分錄 → 拒答說明是維度缺席,並指出還有範疇可用", () => {
    const computedOnly = ledgerOf([
      importedEntry({
        activityKey: "voucher",
        co2eKg: "5",
        provenance: undefined,
        importedOrigin: undefined,
      }),
    ]);
    const result = queryIsoCategorySubtotals(computedOnly);
    if (result.ok) throw new Error("should refuse");
    expect(result.refusal.reason).toBe(
      LedgerRefusalReasonEnum.DIMENSION_ABSENT,
    );
    expect(result.refusal.missing).toContain("ISO 14064 類別");
    expect(result.refusal.missing).toContain("範疇");
  });

  it("帳本空 → 與其他查詢同一個拒答理由", () => {
    const result = queryIsoCategorySubtotals(undefined);
    if (result.ok) throw new Error("should refuse");
    expect(result.refusal.reason).toBe(LedgerRefusalReasonEnum.LEDGER_EMPTY);
  });

  it("前五大排放源的溯源字串帶類別(問「這筆屬於哪一類」不必再查一次)", () => {
    const result = queryTopEmitters(
      ledgerOf([transportEntry], { totalCo2eKg: "3" }),
      1,
    );
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts[0].source).toContain("類別三");
  });
});

describe("queryAnomalies(列舉制)", () => {
  it("只映射三個既存裁決:pending、守恆缺口、合理性警示,各帶證據鏈", () => {
    const ledger = ledgerOf(
      [importedEntry({ activityKey: "a", co2eKg: "1" })],
      {
        pending: [
          { activityKey: "p1", sourceName: "柴油", reason: "無對應係數" },
        ],
        articulation: {
          status: ArticulationStatusEnum.VIOLATED,
          violations: [
            {
              materialName: "鋼捲",
              unit: "噸",
              reason: "CONSUMPTION_GAP" as never,
              expectedConsumption: "100",
              actualConsumption: "80",
              gap: "20",
            },
          ],
          warnings: [
            {
              activityKey: "w1",
              sourceName: "自來水",
              reason: "OVER_PLAUSIBLE_MAX" as never,
              quantity: "999999",
              plausibleMax: "10000",
              unit: "度",
            },
          ],
          checkedAt: "2026-08-25T00:00:00.000Z",
        },
      },
    );
    const result = queryAnomalies(ledger);
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts).toHaveLength(3);
    expect(result.facts[0].label).toBe("待補項:柴油");
    expect(result.facts[1].value).toContain("缺口=20 噸");
    expect(result.facts[2].value).toContain("上限 10000 度");
    expect(result.facts.every((fact) => fact.source.length > 0)).toBe(true);
  });

  it("零觸發回 ok + 空 facts:「查過而無異常」與「沒查」分得出來", () => {
    const result = queryAnomalies(
      ledgerOf([importedEntry({ activityKey: "a", co2eKg: "1" })]),
    );
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts).toEqual([]);
  });

  it("帳本空 → 拒答(無從評估異常,不是「無異常」)", () => {
    const result = queryAnomalies(undefined);
    if (result.ok) throw new Error("should refuse");
    expect(result.refusal.reason).toBe(LedgerRefusalReasonEnum.LEDGER_EMPTY);
  });

  it("帳本空但有勾稽阻擋紀錄 → 回 ok 帶阻擋事實,不拒答(空帳本的原因就是答案)", () => {
    const result = queryAnomalies(undefined, [
      {
        paragraphId: "ch3-4",
        reason: "6 列無法解析;(1) 總公司 差額 201.465(原文 201.465 vs 加總 0)",
        blockedAt: "2026-08-24T00:00:00.000Z",
      },
    ]);
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0].label).toBe("匯入表格被勾稽擋下:ch3-4");
    expect(result.facts[0].value).toContain("6 列無法解析");
    expect(result.facts[0].source).toContain("2026-08-24");
  });

  it("帳本有料 + 阻擋紀錄 → 阻擋事實排最前(它解釋了帳本為何不完整)", () => {
    const result = queryAnomalies(
      ledgerOf([importedEntry({ activityKey: "a", co2eKg: "1" })], {
        pending: [
          { activityKey: "p1", sourceName: "柴油", reason: "無對應係數" },
        ],
      }),
      [
        {
          paragraphId: "ch3-4",
          reason: "勾稽未過",
          blockedAt: "2026-08-24T00:00:00.000Z",
        },
      ],
    );
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts[0].label).toContain("勾稽擋下");
    expect(result.facts[1].label).toContain("待補項");
  });
});

describe("queryYearOverYear(年間量級跳動;獨立入口,不在 queryAnomalies 的列舉裡)", () => {
  const yearOf = (year: number, entries: IComputedLedgerEntry[]) => ({
    year,
    ledger: ledgerOf(entries),
  });
  const named = (sourceName: string, co2eKg: string) =>
    importedEntry({ activityKey: `k:${sourceName}`, co2eKg, sourceName });

  it("只有單一年度 → 拒答(「無法比較」與「比較過沒異常」要分得出來)", () => {
    const result = queryYearOverYear(
      yearOf(2024, [named("屏東 外購電力", "100")]),
      undefined,
    );
    if (result.ok) throw new Error("should refuse");
    expect(result.refusal.reason).toBe(
      LedgerRefusalReasonEnum.DIMENSION_ABSENT,
    );
    /**
     * Info: (20260831 - Emily) 這一行原本斷言 missing 必須含「另一年度」——
     * 也就是把「匯入另一年度的盤查報告後即可比對」那句**指示**釘成了正確
     * (PR #6725 R1 更正:系統不得指示一個會動到既有帳本的動作)。
     * 拒答要說得出缺口,但缺口是「少一個年度的快照」這個狀態,不是一條指令。
     */
    expect(result.refusal.missing).toContain("兩個年度");
    expect(result.refusal.missing).toContain("快照");
    expect(result.refusal.missing).not.toContain("即可");
  });

  it("×3.4 報跳動、×2 不報(門檻是量級不是波動),證據鏈含兩年值與兩邊溯源", () => {
    const result = queryYearOverYear(
      yearOf(2024, [
        named("屏東 外購電力", "3400"),
        named("總公司 外購電力", "200"),
      ]),
      yearOf(2023, [
        named("屏東 外購電力", "1000"),
        named("總公司 外購電力", "100"),
      ]),
    );
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0].label).toBe("年間量級跳動:屏東 外購電力");
    /**
     * Info: (20260831 - Emily) **整串精確比對**,不用子字串(PR #6725 review R3)。
     *
     * reviewer 實測:把 `queryYearOverYear(current, previous)` 兩個引數互換,
     * 跑全套 4660/5 與 baseline 逐字相同 —— 方向反轉沒有任何測試會紅。
     * 原因是三條斷言都是子字串:`value` 的格式是
     * `${previous.year} 年 X → ${current.year} 年 Y(${ratio})`,
     * 互換之後兩個年份與倍數的子字串**都還在**,只有箭頭兩側與倍數反了。
     * 而「哪一年在前」正是這個事實的全部意義。
     */
    expect(result.facts[0].value).toBe(
      "2023 年 1000 kgCO2e → 2024 年 3400 kgCO2e(×3.4)",
    );
    expect(result.facts[0].source).toContain("2023:");
    expect(result.facts[0].source).toContain("2024:");
  });

  it("縮到 ÷3 以下同樣報(減排也可能是漏盤);0 → 正值寫成「0 → X」", () => {
    const result = queryYearOverYear(
      yearOf(2024, [named("A", "100"), named("B", "50")]),
      yearOf(2023, [named("A", "900"), named("B", "0")]),
    );
    if (!result.ok) throw new Error("should be ok");
    expect(result.facts.map((fact) => fact.label)).toEqual([
      "年間量級跳動:A",
      "年間量級跳動:B",
    ]);
    expect(result.facts[1].value).toContain("0 → 50");
  });

  it("消失與新增各自成疑點,措辭不下結論(可能真減排、也可能漏盤)", () => {
    const result = queryYearOverYear(
      yearOf(2024, [named("新設施", "100")]),
      yearOf(2023, [named("舊設施", "100")]),
    );
    if (!result.ok) throw new Error("should be ok");
    const labels = result.facts.map((fact) => fact.label);
    expect(labels).toContain("年間新增排放源:新設施");
    expect(labels).toContain("年間排放源消失:舊設施");
    expect(result.facts.every((fact) => /可能/.test(fact.value))).toBe(true);
  });
});

describe("buildLedgerFactBundle(標準事實包)", () => {
  it("固定形狀:總量+範疇+廠址+前五大;帳本空回空陣列(persona 對無事實另有拒答指令)", () => {
    const ledger = ledgerOf([importedEntry({ activityKey: "a", co2eKg: "1" })]);
    const bundle = buildLedgerFactBundle(ledger);
    const labels = bundle.map((fact) => fact.label);
    expect(labels).toContain("全公司總排放量");
    expect(labels).toContain("(1) 總公司 排放小計");
    expect(labels).toContain("排放量第 1 大:總公司 外購電力");
    expect(bundle.every((fact) => Boolean(fact.source))).toBe(true);
    expect(buildLedgerFactBundle(undefined)).toEqual([]);
  });

  it("異常逾上限:裁尾巴並補「另有 N 條未列出」——據實申報,不靜默截斷", () => {
    const manyPending = Array.from({ length: 120 }, (_, i) => ({
      activityKey: `p${i}`,
      sourceName: `來源${i}`,
      reason: "無對應係數",
    }));
    const ledger = ledgerOf(
      [importedEntry({ activityKey: "a", co2eKg: "1" })],
      { pending: manyPending },
    );
    const bundle = buildLedgerFactBundle(ledger);
    expect(bundle.length).toBeLessThanOrEqual(LEDGER_FACT_BUNDLE_MAX);
    const overflow = bundle[bundle.length - 1];
    expect(overflow.label).toBe("異常事實逾上限");
    const kept = bundle.filter((fact) =>
      fact.label.startsWith("待補項"),
    ).length;
    expect(overflow.value).toBe(`另有 ${120 - kept} 條異常事實未列出`);
  });

  it("最壞情況下整包仍不超過上限,而且疑點還留得住位置(#6783 review 低-2)", () => {
    /**
     * Info: (20260909 - Emily) 這一條守的是「`core` 有上界」這件事本身。
     *
     * 裁剪(`budget`)只裁 `anomalies`,所以 `core` 一旦沒有上界,廠址一多就會
     * 先把疑點全部擠掉,再往上整包超過 `LEDGER_FACT_BUNDLE_MAX` —— 而 validator 的
     * `ledgerFacts` 是 `.max(80)`,**整個聊天請求被 schema 打回**,那間帳本的
     * 每一則訊息都失敗。修正前實測:80 個廠址 → 90 筆。
     *
     * 這裡刻意把每一個維度都推到最大:17 個 GHG 類別鍵(範疇全滿)、六個 ISO 類別
     * 加未標註、80 個廠址、一大堆待補項。
     */
    const sites = 80;
    const isoCategories = [
      Iso14064Category.CATEGORY_1,
      Iso14064Category.CATEGORY_2,
      Iso14064Category.CATEGORY_3,
      Iso14064Category.CATEGORY_4,
      Iso14064Category.CATEGORY_5,
      Iso14064Category.CATEGORY_6,
    ];
    const entries = [
      ...Array.from({ length: sites }, (_, index) =>
        importedEntry({
          activityKey: `k${index}`,
          co2eKg: String(index + 1),
          importedOrigin: {
            site: `(${index}) 廠址${index}`,
            isoCategory: isoCategories[index % isoCategories.length],
            subCategory: "1.1 柴油",
            tableNo: "3.8",
          },
        }),
      ),
      // Info: (20260909 - Emily) 未標註那一桶也要有東西,否則 ISO 只有 6 筆
      importedEntry({
        activityKey: "voucher",
        co2eKg: "1",
        provenance: undefined,
        importedOrigin: undefined,
      }),
    ];
    const allScopeKeys = Object.keys(GhgCategoryDetails);
    const ledger = ledgerOf(entries, {
      scopeSubtotals: Object.fromEntries(
        allScopeKeys.map((key) => [key, "1"]),
      ) as IComputedLedger["scopeSubtotals"],
      pending: Array.from({ length: 200 }, (_, i) => ({
        activityKey: `p${i}`,
        sourceName: `來源${i}`,
        reason: "無對應係數",
      })),
    });
    const bundle = buildLedgerFactBundle(ledger, undefined, {
      2024: ledger,
    });
    expect(bundle.length).toBeLessThanOrEqual(LEDGER_FACT_BUNDLE_MAX);
    /*
     * Info: (20260909 - Emily) 上界成立不夠 —— 還要證明疑點沒有被 core 擠光,
     * 否則「不超過上限」可以靠把疑點全部丟掉來達成(那正是修正前的行為)。
     */
    const anomalies = bundle.filter((fact) => fact.label.startsWith("待補項"));
    expect(anomalies.length).toBeGreaterThanOrEqual(20);
    expect(bundle[bundle.length - 1].label).toBe("異常事實逾上限");
  });
});

describe("維度拆不出來時要說出來,而不是沉默(#6783 review 低-3)", () => {
  /**
   * Info: (20260909 - Emily) 拒答經 `toContextFacts` 一律不產生事實,於是
   * 「這本帳沒有這個維度」在清單裡是沉默的 —— 而沉默無法區分「查過」與「沒查」。
   * 對 ISO 類別特別危險:模型可能拿「範疇三合計」充當「類別三」,而那個數字是
   * 合法的、守門看不出錯(守門裁決數字,不裁決標籤)。
   */
  const voucherOnly = () =>
    ledgerOf(
      [
        importedEntry({
          activityKey: "voucher",
          co2eKg: "5",
          provenance: undefined,
          importedOrigin: undefined,
        }),
      ],
      { totalCo2eKg: "5" },
    );

  it("帳本只有憑證分錄 → 事實包裡有「ISO 14064-1 類別拆分:無法進行」", () => {
    const bundle = buildLedgerFactBundle(voucherOnly());
    const fact = bundle.find((item) =>
      item.label.startsWith("ISO 14064-1 類別拆分"),
    );
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("沒有帶 ISO 14064 類別的分錄");
    // Info: (20260909 - Emily) 它不是排放數字,不得成為守門的合法來源
    expect(fact!.emissionsKg).toBeUndefined();
  });

  it("廠址維度缺席也要說(同一個缺口的另一半)", () => {
    const bundle = buildLedgerFactBundle(voucherOnly());
    const fact = bundle.find((item) => item.label.startsWith("廠址拆分"));
    expect(fact).toBeDefined();
    expect(fact!.value).toContain("廠址");
    expect(fact!.emissionsKg).toBeUndefined();
  });

  it("維度真的有的時候不送那一筆(有小計就不該再說「無法進行」)", () => {
    const bundle = buildLedgerFactBundle(
      ledgerOf([importedEntry({ activityKey: "a", co2eKg: "1" })]),
    );
    expect(bundle.some((item) => item.label.includes("拆分:無法進行"))).toBe(
      false,
    );
  });

  it("帳本整本是空的時候不送:那時每個查詢都拒答,persona 走無事實分支", () => {
    expect(buildLedgerFactBundle(undefined)).toEqual([]);
    expect(buildLedgerFactBundle(ledgerOf([]))).toEqual([]);
  });
});

describe("buildLedgerFactBundle × 年度快照(#6719)", () => {
  it("滿兩年 → 年間比較事實隨包注入(取最近兩年)", () => {
    const current = ledgerOf([
      importedEntry({ activityKey: "a", co2eKg: "3400", sourceName: "電力" }),
    ]);
    const bundle = buildLedgerFactBundle(current, undefined, {
      2022: ledgerOf([
        importedEntry({ activityKey: "x", co2eKg: "999", sourceName: "電力" }),
      ]),
      2023: ledgerOf([
        importedEntry({ activityKey: "x", co2eKg: "1000", sourceName: "電力" }),
      ]),
      2024: current,
    });
    const yoy = bundle.filter((fact) => fact.label.startsWith("年間"));
    expect(yoy).toHaveLength(1);
    // Info: (20260831 - Emily) 同 R3:整串比對,方向反了要紅
    expect(yoy[0].value).toBe(
      "2023 年 1000 kgCO2e → 2024 年 3400 kgCO2e(×3.4)",
    );
    expect(yoy[0].value).not.toContain("2022");
  });

  /**
   * Info: (20260831 - Emily) 這一格原本斷言「單一年度 → 一條年間事實都沒有」,
   * 而那正是缺陷本身(PR #6725 R1 更正時追出來的):
   * persona 有一條「使用者問跟去年比 → 照清單中拒答說明的原文轉述」,
   * 清單裡卻永遠沒有那則說明 —— 模型被要求轉述一段不存在的文字,
   * 而它下一步會做什麼沒有人保證。舊測試把這個狀態釘成了「正確」。
   */
  it("說明進 core 不進異常池:不佔「另有 N 條異常事實未列出」的計數", () => {
    /**
     * Info: (20260831 - Emily) 第一版我把它放進 anomalies —— 兩個後果:
     * 異常池被上限裁掉時它會第一個消失(而帳本最忙時最該說得出為什麼比不了),
     * 且逾上限那句會把它算成一條「異常事實」。與 pending 那格同一種錯。
     */
    const manyPending = Array.from({ length: 120 }, (_, i) => ({
      activityKey: `p${i}`,
      sourceName: `來源${i}`,
      reason: "無對應係數",
    }));
    const ledger = ledgerOf(
      [importedEntry({ activityKey: "a", co2eKg: "1" })],
      {
        pending: manyPending,
      },
    );
    const bundle = buildLedgerFactBundle(ledger);
    expect(bundle.some((fact) => fact.label === "年間比較:無法進行")).toBe(
      true,
    );
    const overflow = bundle[bundle.length - 1];
    const kept = bundle.filter((fact) =>
      fact.label.startsWith("待補項"),
    ).length;
    expect(overflow.value).toBe(`另有 ${120 - kept} 條異常事實未列出`);
  });

  it("單一年度 → 送出一條說明(「無法比較」與「沒查過」要分得出來)", () => {
    const current = ledgerOf([
      importedEntry({ activityKey: "a", co2eKg: "1" }),
    ]);
    const bundle = buildLedgerFactBundle(current, undefined, { 2024: current });
    const explain = bundle.filter((fact) => fact.label === "年間比較:無法進行");
    expect(explain).toHaveLength(1);
    expect(explain[0].value).toContain("2024");
    expect(explain[0].source).toContain("1 個年度");
  });

  it("沒有任何年度快照但帳本有分錄 → 說明指向「沒有標註盤查年度」", () => {
    const current = ledgerOf([
      importedEntry({ activityKey: "a", co2eKg: "1" }),
    ]);
    const bundle = buildLedgerFactBundle(current);
    const explain = bundle.filter((fact) => fact.label === "年間比較:無法進行");
    expect(explain).toHaveLength(1);
    expect(explain[0].value).toContain("盤查年度");
  });

  it("帳本空時不送這條(那時每個查詢都拒答,persona 走無事實分支)", () => {
    expect(buildLedgerFactBundle(undefined)).toEqual([]);
    expect(buildLedgerFactBundle(ledgerOf([]))).toEqual([]);
  });

  /**
   * Info: (20260831 - Emily) R1 更正的核心:**系統不得指示一個會動到既有帳本的動作**。
   *
   * 原文是「匯入另一年度的盤查報告後即可比對」,而在規則 3 之前那個動作
   * 會安靜地把總量弄髒(孤兒列虛增 28.6%)。規則 3 之後那條路安全了,
   * 但這句話仍然不該由系統說 —— 拒答的職責是說明為什麼答不出來。
   *
   * 斷言錨在短詞上(不整句比對):出現「匯入…即可」這種指示形狀就紅。
   */
  it("說明只描述狀態,不指示使用者去匯第二份報告", () => {
    const current = ledgerOf([
      importedEntry({ activityKey: "a", co2eKg: "1" }),
    ]);
    const bundle = buildLedgerFactBundle(current, undefined, { 2024: current });
    const explain = bundle.find((fact) => fact.label === "年間比較:無法進行");
    expect(explain?.value).not.toContain("即可");
    expect(explain?.value).not.toContain("匯入另一年度");
    expect(explain?.value).not.toContain("請先");
  });
});

/**
 * Info: (20260831 - Emily) 同一條立場在拒答本體上也要成立(PR #6725 R1 更正)。
 * 界線不是「祈使句一律不准」:帳本為空時的「請先匯入盤查報告」照留 ——
 * 那個動作沒有任何既有資料可以弄髒。要擋的是指示一個會動到既有帳本的動作。
 */
describe("queryYearOverYear 的拒答說明不指示動作(R1 更正)", () => {
  const oneYear = {
    year: 2024,
    ledger: ledgerOf([importedEntry({ activityKey: "a", co2eKg: "1" })]),
  };

  it("兩態都只說狀態", () => {
    const refused = queryYearOverYear(oneYear, undefined);
    expect(refused.ok).toBe(false);
    const missing = refused.ok ? "" : refused.refusal.missing;
    expect(missing).toContain("快照");
    expect(missing).not.toContain("即可");
    expect(missing).not.toContain("匯入另一年度");
  });

  it("帳本為空的拒答仍然可以說「請先匯入」(沒有既有資料可弄髒)", () => {
    const refused = queryTotal(undefined);
    expect(refused.ok).toBe(false);
    expect(refused.ok ? "" : refused.refusal.missing).toContain("請先匯入");
  });
});

/**
 * Info: (20260831 - Emily) persona 與查詢層的**同一個標籤**要對得上(R1 更正)。
 *
 * 這條掃描守的是這次追出來的那種缺陷:persona 指示模型「照清單中的說明轉述」,
 * 而清單裡根本沒有那筆 —— 兩端各自看起來都正確,錯在它們之間。
 * 掃描只回答「兩端字面對不對得上」,不宣稱驗了模型行為(§1.11)。
 */
describe("persona 引用的標籤與查詢層產出的一致(R1 更正)", () => {
  const service = fs.readFileSync(
    path.join(process.cwd(), "src/services/chat.service.ts"),
    "utf-8",
  );

  /**
   * Info: (20260831 - Emily) **兩側都要走**(PR #6725 review §1.13)。
   *
   * 上一版只驗「單一年度」那一側 —— 迭代誰的鍵,就只看得見誰。
   * 兩個年度那一側(有跳動 / 沒跳動)的 label 沒有任何檢查,
   * 而 persona 原本指名的是單一年度那個 label,兩年穩定時它不存在。
   */
  it("persona 指名的前綴涵蓋事實包的每一種年間 label(兩側都驗)", () => {
    const one = ledgerOf([importedEntry({ activityKey: "a", co2eKg: "1" })]);
    const noJumpCurrent = ledgerOf([
      importedEntry({ activityKey: "k", co2eKg: "1100", sourceName: "電力" }),
    ]);
    const jumpCurrent = ledgerOf([
      importedEntry({ activityKey: "k", co2eKg: "3400", sourceName: "電力" }),
    ]);
    const prior = ledgerOf([
      importedEntry({ activityKey: "k", co2eKg: "1000", sourceName: "電力" }),
    ]);

    const labelsOf = (
      ledger: typeof one,
      byYear?: Record<number, typeof one>,
    ): string[] =>
      buildLedgerFactBundle(ledger, undefined, byYear)
        .map((fact) => fact.label)
        .filter((label) => label.startsWith("年間"));

    const single = labelsOf(one, { 2024: one });
    const noJump = labelsOf(noJumpCurrent, {
      2023: prior,
      2024: noJumpCurrent,
    });
    const jumped = labelsOf(jumpCurrent, { 2023: prior, 2024: jumpCurrent });

    // Info: (20260831 - Emily) 三種上游狀態各自都要有一筆,沒有一種是沉默
    expect(single).toHaveLength(1);
    expect(noJump).toHaveLength(1);
    expect(jumped).toHaveLength(1);
    // Info: (20260831 - Emily) persona 引用的是前綴,所以前綴必須真的涵蓋三種
    [...single, ...noJump, ...jumped].forEach((label) => {
      expect(label.startsWith("年間")).toBe(true);
    });
    expect(service).toContain("以「年間」開頭的事實");
  });

  it("persona 明說不得指示使用者再匯一份報告", () => {
    expect(service).toContain("不要自行指示使用者去做任何動作");
    expect(service).toContain("再匯一份報告");
  });
});

/**
 * Info: (20260831 - Emily) 三種上游狀態要有三種可觀測值(PR #6725 review R4 殘留半)。
 *
 * reviewer 實測的兩格塌陷:
 *   PROBE-B 兩個年度 + 年增 10%(不跨門檻)→ 事實包裡年間事實 **0 筆**,
 *           而 persona 被指示去轉述一筆不存在的「無法進行」說明
 *   PROBE-C 兩個年度 + ×3.4 跳動 + 異常池溢出 → 跳動事實 **0 筆**
 *           (排在池尾,被 slice 裁掉),LLM 只讀到「另有 45 條異常事實未列出」
 */
describe("年間比較的三種狀態各有可觀測值(review R4)", () => {
  const named = (sourceName: string, co2eKg: string) =>
    importedEntry({ activityKey: `k:${sourceName}`, co2eKg, sourceName });

  it("兩年都在、什麼都沒跨門檻 → 回「查過而無異常」,不是沉默", () => {
    const result = queryYearOverYear(
      { year: 2024, ledger: ledgerOf([named("屏東 外購電力", "1100")]) },
      { year: 2023, ledger: ledgerOf([named("屏東 外購電力", "1000")]) },
    );
    expect(result.ok).toBe(true);
    const facts = result.ok ? result.facts : [];
    expect(facts).toHaveLength(1);
    expect(facts[0].label).toBe("年間比較:各排放源皆未跨門檻");
    expect(facts[0].value).toContain("2023");
    expect(facts[0].value).toContain("2024");
    // Info: (20260831 - Emily) 沉默與「查過」必須分得出來,所以這一筆不能被省
    expect(facts[0].source).toContain("年度快照");
  });

  it("年增 10% 的主要路徑上,事實包裡確實有以「年間」開頭的事實", () => {
    const current = ledgerOf([named("屏東 外購電力", "1100")]);
    const bundle = buildLedgerFactBundle(current, undefined, {
      2023: ledgerOf([named("屏東 外購電力", "1000")]),
      2024: current,
    });
    expect(bundle.some((fact) => fact.label.startsWith("年間"))).toBe(true);
  });

  it("異常池溢出時,年間事實不會被裁掉(它排在最前面)", () => {
    const manyPending = Array.from({ length: 120 }, (_, i) => ({
      activityKey: `p${i}`,
      sourceName: `來源${i}`,
      reason: "無對應係數",
    }));
    const current = ledgerOf([named("屏東 外購電力", "3400")], {
      pending: manyPending,
    });
    const bundle = buildLedgerFactBundle(current, undefined, {
      2023: ledgerOf([named("屏東 外購電力", "1000")]),
      2024: current,
    });
    const yoy = bundle.filter((fact) => fact.label.startsWith("年間"));
    expect(yoy).toHaveLength(1);
    expect(yoy[0].value).toBe(
      "2023 年 1000 kgCO2e → 2024 年 3400 kgCO2e(×3.4)",
    );
    // Info: (20260831 - Emily) 逾上限那句仍在(據實申報沒有被這次排序改掉)
    expect(bundle[bundle.length - 1].label).toBe("異常事實逾上限");
  });
});

describe("toContextFacts 帶著 emissionsKg 過接縫(9/08 實測漏了 12 天)", () => {
  /**
   * Info: (20260908 - Emily) 查詞層每一筆排放量事實都填了 `emissionsKg`,出口守門也照它裁決,
   * 但這個 mapper 手抄三個欄位、漏了第四個 —— 於是事實包送出去的每一筆都沒有它:
   * round-5 的洗白防線沒關上、kg↔公噸換算沒有材料、當日新做的一致判定與指紋全部失效。
   * 這一組是**接縫**測試:從 bundle 一路餵到守門,不各自用夾具。
   */
  const seamLedger = () =>
    ledgerOf(
      [
        importedEntry({
          activityKey: "a",
          co2eKg: "227898.6",
          convertedQuantity: "1000",
          convertedUnit: "立方公尺",
        }),
      ],
      {
        scopeSubtotals: { SCOPE_1_DIRECT: "227898.6" },
        totalCo2eKg: "227898.6",
      },
    );

  it("bundle 裡每一筆排放量事實都還帶著 emissionsKg", () => {
    const bundle = buildLedgerFactBundle(seamLedger());
    const emissionFacts = bundle.filter(
      (fact) => /kgCO2e$/.test(fact.value) || /kgCO2e\(/.test(fact.value),
    );
    expect(emissionFacts.length).toBeGreaterThan(0);
    emissionFacts.forEach((fact) =>
      expect(fact.emissionsKg?.length ?? 0).toBeGreaterThan(0),
    );
  });

  it("守門拿 bundle 能做 kg↔公噸換算:「227.8986 公噸」合法", () => {
    const allowed = collectAllowedNumbers(
      buildLedgerFactBundle(seamLedger()),
      [],
    );
    expect(allowed.emissionKg.has("227898.6")).toBe(true);
    expect(
      adjudicateQuantityClaims(
        extractQuantityClaims("總量 227.8986 公噸 CO2e"),
        allowed,
      ),
    ).toEqual([]);
  });

  it("守門拿 bundle 不放行活動數據當排放量:「1000 kgCO2e」被攔(round-5 的防線真的關上)", () => {
    /**
     * Info: (20260908 - Emily) 前五大那筆的 value 是「227898.6 kgCO2e(1000 立方公尺,占…)」。
     * 沒有 emissionsKg 時 1000 會進 equality;有了它,只有 227898.6 進去。
     */
    const allowed = collectAllowedNumbers(
      buildLedgerFactBundle(seamLedger()),
      [],
    );
    expect(allowed.equality.has("1000")).toBe(false);
    expect(
      adjudicateQuantityClaims(
        extractQuantityClaims("排放 1000 kgCO2e"),
        allowed,
      ),
    ).toHaveLength(1);
  });
});

describe("toContextFacts", () => {
  it("ok 攤平成 IContextFact;拒答回空陣列(拒答句不給 LLM 填空)", () => {
    const ok = queryTotal(
      ledgerOf([importedEntry({ activityKey: "a", co2eKg: "1" })]),
    );
    expect(toContextFacts(ok).length).toBeGreaterThan(0);
    expect(toContextFacts(ok)[0]).toHaveProperty("source");
    expect(toContextFacts(queryTotal(undefined))).toEqual([]);
  });
});

/**
 * Info: (20260904 - Emily) 「不指示一個會動到既有帳本的動作」擴到**所有帳本事實值**。
 *
 * 這條界線在 PR #6725 R1 就立好了,但當時只套在 refusal 的 `missing` 上
 *(見上面那兩組)。而第五個偵測器(年度標註不完整)把
 * 「清空帳本後逐年重新匯入即可確定歸屬」寫進了 `ILedgerFact.value` ——
 * **同一條界線的另一半沒有守衛,所以它安靜地穿過去、跟著合併進 develop。**
 *
 * 事實值會被逐字帶進敘事(`toContextFacts` → 注入層 → LLM),
 * 所以紙面上讀起來就是系統的建議。而「清空帳本」會連非匯入的憑證計算分錄
 * 一起丟掉,「逐年重新匯入」預設使用者手上還留著每一份原始報告。
 *
 * ## 為什麼是走完六個入口,而不是再補一條專屬於年度警示的斷言
 *
 * 補一條專屬的,第三個偵測器還是會再寫一次 —— 這已經是第二次了。
 * 這一條走完本模組所有會產出 `ILedgerFact` 的入口,新偵測器一加進來就自動被涵蓋。
 *
 * ## 涵蓋範圍到哪裡為止(2026-09-06 review:產品決定)
 *
 * **只涵蓋帳本事實值,不涵蓋附件萃取的事實值。** 全庫另有一個 `IContextFact`
 * 的生產者:`attachment_extraction.service.ts`,它的 `value` 是 LLM 依 responseSchema
 * 回的自由字串,經 `attachmentFacts → contextFacts → paragraph_draft.service` 上紙。
 *
 * 那一側**刻意不套同一個錨**:那些值萃取自客戶自己上傳的文件,而客戶的原文
 * 本來就可能寫「建議清空重建」之類的句子 —— 擋它等於刪原文,與這條產品線
 * 「原文照錄」的立場衝突。兩者的差別是**這句話是誰說的**:
 * 帳本事實值是系統說的(讀者會當成建議),附件事實值是客戶自己文件裡的字。
 *
 * 所以標題寫「帳本事實值」而不是「事實值」—— 下一個人不會以為這條界線是全庫的,
 * 也不會照著把錨套到附件那條路上而誤刪原文。
 *
 * ## 錨在哪些詞,為什麼
 *
 * `清空` / `刪除` / `重新匯入` 是動到既有帳本的動作;`即可` 是指示的句型
 *(上面兩組已經在用同一個錨)。**不是「祈使句一律不准」**:帳本為空時的
 * 「請先匯入盤查報告」照留,那個動作沒有任何既有資料可以弄髒 —— 那條界線
 * 由上面「帳本為空的拒答仍然可以說『請先匯入』」那一條守著,兩條互為界線。
 */
describe("所有帳本事實值都不得指示一個會動到既有帳本的動作(R1 的另一半)", () => {
  const DESTRUCTIVE_ANCHORS = ["清空", "刪除", "重新匯入", "即可"];

  const ledger = ledgerOf(
    [
      importedEntry({ activityKey: "site-a", co2eKg: "100" }),
      importedEntry({ activityKey: "site-b", co2eKg: "50" }),
    ],
    {
      pending: [
        {
          activityKey: "pending-a",
          sourceName: "柴油",
          reason: "缺少活動數據",
        },
      ],
    },
  );

  /** Info: (20260904 - Emily) 六個入口全走一遍;新增入口要記得加進這裡 */
  const allFactValues = (): string[] => {
    const yearWarning = { incomingYear: 2024, undatedCount: 6 };
    const blocks = [
      {
        paragraphId: "3.8",
        reason: "6 列無法解析",
        blockedAt: "2026-09-04T00:00:00.000Z",
      },
    ];
    const results = [
      queryTotal(ledger),
      queryTopEmitters(ledger, 3),
      querySiteSubtotals(ledger),
      queryAnomalies(ledger, blocks, yearWarning),
      queryYearOverYear(
        { year: 2024, ledger },
        { year: 2023, ledger: ledgerOf([]) },
      ),
    ];
    return [
      ...results.flatMap((result) =>
        result.ok ? result.facts.map((fact) => fact.value) : [],
      ),
      ...buildLedgerFactBundle(
        ledger,
        blocks,
        { 2024: ledger },
        yearWarning,
      ).map((fact) => fact.value),
    ];
  };

  it("六個入口產出的事實值都沒有破壞性指示", () => {
    const values = allFactValues();
    // Info: (20260904 - Emily) 反空集合:入口都拒答時這條會空轉而看起來很綠
    expect(values.length).toBeGreaterThan(3);
    values.forEach((value) => {
      DESTRUCTIVE_ANCHORS.forEach((anchor) => {
        expect(value).not.toContain(anchor);
      });
    });
  });

  it("年度警示仍然說得出代價(拿掉指示不等於拿掉資訊)", () => {
    /**
     * Info: (20260904 - Emily) 這一條是上一條的配對。只斷言「沒有指示」的話,
     * 把整句話刪掉也會綠 —— 而那會讓 #6707 的第五個偵測器變成一個沒有內容的警示。
     */
    const result = queryAnomalies(ledger, undefined, {
      incomingYear: 2024,
      undatedCount: 6,
    });
    const fact = result.ok
      ? result.facts.find((item) => item.label.includes("年度標註不完整"))
      : undefined;
    expect(fact?.value).toContain("虛增");
    expect(fact?.value).toContain("2024");
    expect(fact?.value).toContain("無法確定");
  });
});
