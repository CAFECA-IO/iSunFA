import { describe, it, expect } from "@jest/globals";
import {
  buildLedgerFactBundle,
  queryYearOverYear,
  toContextFacts,
} from "@/lib/carbon_ledger_query";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import {
  LedgerProvenanceEnum,
  EmissionBasisEnum,
} from "@/constants/imported_quantity";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
import type {
  IComputedLedger,
  IComputedLedgerEntry,
  IReportParagraph,
} from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";
import { buildReportFacts } from "@/lib/carbon_report_facts";

/**
 * Info: (20260908 - Emily) 事實的 label / source **只放人話**(owner 9/08 實測後判定)。
 *
 * persona 逐筆把事實印給 LLM,LLM 再逐字轉述給使用者 —— 所以 label / source 裡有什麼,
 * 使用者就會看到什麼。9/08 owner 的截圖裡出現了 `[SCOPE_3_CAT_1]`、`(MoneyUtil)`、
 * 「表表3.8」;同一個檔案掃過去共 8 處是機器識別碼或實作細節:enum 鍵、內部 slug
 * (activityKey)、模組名(articulation)、工具名(MoneyUtil)。查核者的追溯另有路
 * (帳本自己存著鍵、報告的表 3.8 帶著表號),事實包不需要再扛一份。
 *
 * ## 為什麼是跑真的事實包,而不是掃原始碼
 *
 * 識別碼多半是插值進來的(`${scope}`、`${activityKey}`),掃字面找不到。
 * 這裡組一份**踩遍每一個事實產生器**的帳本(匯入分錄、憑證分錄、待補、守恆缺口、
 * 合理性警示、匯入阻擋、年度警示、年間比較),把產出的每一個字串過一次黑名單。
 * 並且斷言覆蓋:每一類事實都至少出現一筆 —— 否則夾具空著也會綠。
 */
const importedEntry = (
  overrides: Partial<IComputedLedgerEntry> & {
    activityKey: string;
    co2eKg: string;
  },
): IComputedLedgerEntry => ({
  scopeCategory: GhgProtocolCategory.SCOPE_3_CAT_4,
  sourceName: "總公司 上游運輸",
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
    isoCategory: Iso14064Category.CATEGORY_3,
    subCategory: "3.1 上游運輸",
    // Info: (20260908 - Emily) 上游正規化後的實際寫法(帶「表」),釘住「表表」
    tableNo: "表3.8",
  },
  ...overrides,
});

const richLedger = (): IComputedLedger => ({
  entries: [
    importedEntry({ activityKey: "imp_transport_hq", co2eKg: "176821.1" }),
    importedEntry({
      activityKey: "imp_goods_hq",
      co2eKg: "683966.6",
      scopeCategory: GhgProtocolCategory.SCOPE_3_CAT_1,
      sourceName: "總公司 購買商品",
      importedOrigin: {
        site: "(1) 總公司",
        isoCategory: Iso14064Category.CATEGORY_4,
        subCategory: "4.1 購買商品",
        tableNo: "表3.8",
      },
    }),
    importedEntry({
      activityKey: "voucher_diesel_stationary",
      co2eKg: "1000",
      scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
      sourceName: "柴油(固定源)",
      convertedQuantity: "380",
      convertedUnit: "L",
      provenance: LedgerProvenanceEnum.COMPUTED,
      importedOrigin: undefined,
    }),
  ],
  pending: [
    {
      activityKey: "pending_lpg_key",
      sourceName: "液化石油氣",
      reason: "無對應係數",
    },
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
        activityKey: "warn_water_key",
        sourceName: "自來水",
        reason: "OVER_PLAUSIBLE_MAX" as never,
        quantity: "999999",
        plausibleMax: "10000",
        unit: "度",
      },
    ],
    checkedAt: "2026-09-01T00:00:00.000Z",
  },
  scopeSubtotals: {
    SCOPE_1_DIRECT: "1000",
    SCOPE_3_CAT_1: "683966.6",
    SCOPE_3_CAT_4: "176821.1",
  },
  totalCo2eKg: "861787.7",
  computedAt: "2026-09-01T00:00:00.000Z",
});

/**
 * Info: (20260908 - Emily) 黑名單。每一條都對應 9/08 掃到的一處真實洩漏,或它的同類。
 * `\[[A-Z][A-Z0-9_]+\]`:方括號裡的大寫底線鍵(`[SCOPE_3_CAT_1]`)。
 * `SCOPE_[0-9]` / `CATEGORY_[0-9]`:enum 鍵本體,不論有沒有括號。
 * `_key` / `_stationary` 這類 slug 由夾具的 activityKey 帶進來 —— 斷言它們沒有外洩。
 */
const FORBIDDEN: RegExp[] = [
  /\[[A-Z][A-Z0-9_]+\]/,
  /SCOPE_[0-9]/,
  /CATEGORY_[0-9]/,
  /MoneyUtil/,
  /articulation/i,
  /activityKey/,
  /表表/,
  // Info: (20260909 - Emily) #6789 review 低:markdown 粗體符號進了送 LLM 的字串,模型會照抄
  /\*\*/,
  /pending_lpg_key|warn_water_key|voucher_diesel_stationary|imp_transport_hq|imp_goods_hq/,
];

const allStrings = (facts: IContextFact[]): string[] =>
  facts.flatMap((fact) => [fact.label, fact.source ?? ""]);

describe("事實包的 label / source 只放人話", () => {
  const bundle = buildLedgerFactBundle(
    richLedger(),
    [
      {
        paragraphId: "3.2",
        reason: "差額 700.0005(原文 901.465 vs 加總 201.4645)",
        blockedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    undefined,
    { incomingYear: 2024, undatedCount: 6 },
  );

  it("夾具踩遍每一類事實(否則空夾具也會綠)", () => {
    const labels = bundle.map((fact) => fact.label);
    const mustHave: [string, RegExp][] = [
      ["總量", /^全公司總排放量$/],
      ["範疇合計", /^範疇三合計/],
      ["範疇成員", /^範疇三:/],
      ["ISO 類別小計", /^類別三 排放小計/],
      ["未標註類別", /^未標註 ISO 類別/],
      ["廠址小計", /^\(1\) 總公司 排放小計$/],
      ["前五大", /^排放量第 1 大/],
      ["年間比較說明", /^年間比較:無法進行/],
      ["匯入阻擋", /^匯入表格被勾稽擋下/],
      ["年度警示", /^年度標註不完整/],
      ["待補", /^待補項:/],
      ["守恆缺口", /^質量守恆缺口:/],
      ["合理性警示", /^合理性警示:/],
    ];
    mustHave.forEach(([name, pattern]) => {
      expect(labels.some((label) => pattern.test(label))).toBe(true);
      void name;
    });
  });

  it("沒有一個 label / source 含 enum 鍵、內部 slug、實作細節", () => {
    const offenders = allStrings(bundle).filter((text) =>
      FORBIDDEN.some((pattern) => pattern.test(text)),
    );
    expect(offenders).toEqual([]);
  });

  it("年間比較的事實同樣乾淨(不在標準 bundle 的夾具裡,單獨跑)", () => {
    const prior = richLedger();
    const current: IComputedLedger = {
      ...richLedger(),
      entries: richLedger().entries.map((entry) => ({
        ...entry,
        co2eKg: `${Number(entry.co2eKg) * 4}`,
      })),
    };
    const facts = toContextFacts(
      queryYearOverYear(
        { year: 2023, ledger: prior },
        { year: 2024, ledger: current },
      ),
    );
    expect(facts.length).toBeGreaterThan(0);
    const offenders = allStrings(facts).filter((text) =>
      FORBIDDEN.some((pattern) => pattern.test(text)),
    );
    expect(offenders).toEqual([]);
  });

  it("報告本體的事實(carbon_report_facts)同樣乾淨 —— 不一致那筆不得夾 markdown 粗體", () => {
    /**
     * Info: (20260909 - Emily) #6789 review 低:「**帳本事實裡沒有這個數值**」的星號進了送 LLM 的字串,
     * 模型會照抄,回覆裡多一對星號。報告事實走另一支模組,所以這裡單獨餵。
     */
    const paragraphs: IReportParagraph[] = [
      {
        id: "p-3.2",
        chapterId: "ch3",
        code: "3.2",
        title: "3.2 排放量計算",
        content: "本節寫的總量為 999.999 公噸 CO2e(帳本裡沒有這個數)。",
        isCompleted: true,
        isVerified: false,
        isDataDriven: true,
      },
    ];
    const facts = buildReportFacts({
      paragraphs,
      rawMarkdown: undefined,
      ledgerFacts: bundle,
      budget: 10,
    });
    expect(facts.length).toBeGreaterThan(0);
    const offenders = allStrings(facts).filter((text) =>
      FORBIDDEN.some((pattern) => pattern.test(text)),
    );
    expect(offenders).toEqual([]);
  });

  it("黑名單自己有效:餵一筆帶識別碼的假事實會被抓到", () => {
    /**
     * Info: (20260908 - Emily) 掃描器自己的測試(#6677 的教訓)。
     * 若 FORBIDDEN 被人改壞成永遠不命中,上面那兩條會假綠 —— 這一條讓它紅。
     */
    const dirty: IContextFact[] = [
      {
        label: "能源間接 [SCOPE_2_INDIRECT] 小計",
        value: "1 kgCO2e",
        source: "x",
      },
      {
        label: "a",
        value: "1",
        source: "原文照錄 表表3.8 分錄加總(MoneyUtil)",
      },
      { label: "b", value: "1", source: "帳本質量守恆勾稽(articulation)" },
    ];
    const offenders = allStrings(dirty).filter((text) =>
      FORBIDDEN.some((pattern) => pattern.test(text)),
    );
    expect(offenders).toHaveLength(3);
  });
});
