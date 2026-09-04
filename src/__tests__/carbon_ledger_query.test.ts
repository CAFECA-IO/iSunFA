// Info: (20260825 - Emily) 帳本確定性查詢層的測試(#6707 第一層)。
// Info: (20260825 - Emily) 形狀取自 run G 的真實帳本(高興昌三廠址),數字縮小以便肉眼驗算。

import fs from "fs";
import path from "path";
import {
  queryTotal,
  queryTopEmitters,
  querySiteSubtotals,
  queryAnomalies,
  queryYearOverYear,
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
      // Info: (20260827 - Emily) 排放量本體另以結構標記,供出口守門裁決(見 IContextFact.emissionsKg)
      emissionsKg: ["999"],
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
    expect(result.facts).toEqual([
      {
        label: "(1) 總公司 排放小計",
        value: "0.3 kgCO2e",
        source: "原文照錄 表3.8 分錄加總(MoneyUtil)",
        emissionsKg: ["0.3"],
      },
      {
        label: "(2) 台北分公司 排放小計",
        value: "7 kgCO2e",
        source: "原文照錄 表3.8 分錄加總(MoneyUtil)",
        emissionsKg: ["7"],
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
 * Info: (20260904 - Emily) 「不指示一個會動到既有帳本的動作」擴到**所有事實值**。
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
 * 這一條走完所有會產出 `ILedgerFact` 的入口,新偵測器一加進來就自動被涵蓋。
 *
 * ## 錨在哪些詞,為什麼
 *
 * `清空` / `刪除` / `重新匯入` 是動到既有帳本的動作;`即可` 是指示的句型
 *(上面兩組已經在用同一個錨)。**不是「祈使句一律不准」**:帳本為空時的
 * 「請先匯入盤查報告」照留,那個動作沒有任何既有資料可以弄髒 —— 那條界線
 * 由上面「帳本為空的拒答仍然可以說『請先匯入』」那一條守著,兩條互為界線。
 */
describe("所有事實值都不得指示一個會動到既有帳本的動作(R1 的另一半)", () => {
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
