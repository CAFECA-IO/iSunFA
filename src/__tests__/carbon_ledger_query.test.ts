// Info: (20260825 - Emily) 帳本確定性查詢層的測試(#6707 第一層)。
// Info: (20260825 - Emily) 形狀取自 run G 的真實帳本(高興昌三廠址),數字縮小以便肉眼驗算。

import {
  queryTotal,
  queryTopEmitters,
  querySiteSubtotals,
  queryAnomalies,
  toContextFacts,
  buildLedgerFactBundle,
  LedgerRefusalReasonEnum,
  LEDGER_FACT_BUNDLE_MAX,
} from "@/lib/carbon_ledger_query";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
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
    expect(result.facts[1]).toEqual({
      label: "SCOPE_2_INDIRECT 小計",
      value: "999 kgCO2e",
      source: "帳本範疇小計欄",
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
    expect(result.facts[0].source).toBe(
      "原文照錄 表3.8 (1) 總公司 2.1 外購電力",
    );
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
    expect(result.facts).toEqual([
      {
        label: "(1) 總公司 排放小計",
        value: "0.3 kgCO2e",
        source: "原文照錄 表3.8 分錄加總(MoneyUtil)",
      },
      {
        label: "(2) 台北分公司 排放小計",
        value: "7 kgCO2e",
        source: "原文照錄 表3.8 分錄加總(MoneyUtil)",
      },
    ]);
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
