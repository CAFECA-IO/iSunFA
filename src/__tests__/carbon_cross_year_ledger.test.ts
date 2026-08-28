import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  buildYearSnapshot,
  detectUndatedImportedEntries,
  mergeImportedLedgerEntries,
} from "@/lib/carbon_ledger_totals";
import { queryAnomalies } from "@/lib/carbon_ledger_query";
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

/**
 * Info: (20260827 - Emily) 「年度未知」不猜,但要說出來(PR #6725 round-2 高-1)。
 *
 * `importedOrigin.year` 是新增的選填欄位,而帳本住在客戶端的 E2EE 草稿裡、
 * **沒有回填路徑** —— 所以每一個既有帳本的匯入分錄都是年度未知,
 * 升版後再匯一年就 100% 走進孤兒列那條路,而 #6719 的引導句正把他們送過去。
 *
 * Info: (20260828 - Emily) 說的方式改掉了(round-2 追加回饋):**不走 pending**。
 * pending 的語意是「活動數據待補」,借用它就是從既有桶子偷渡第五個偵測器 ——
 * 而 queryAnomalies 的列舉制註解明文禁止那件事。改為獨立訊號
 * (detectUndatedImportedEntries → state.ledgerYearWarning → 列舉的第五個偵測器),
 * 所以這一組測試同時釘住「有說」與「沒有借用 pending」。
 */
describe("既有帳本(年度未知)再匯一年時要說出來(round-2 高-1 + 追加回饋)", () => {
  const undated2023 = [
    importedEntry("(1) 總公司", "1000000"),
    importedEntry("(2) 舊廠", "400000"),
  ];
  const dated2024 = [
    importedEntry("(1) 總公司", "1100000", 2024),
    importedEntry("(3) 新廠", "300000", 2024),
  ];

  it("偵測器回報本次年度與無年度分錄的筆數", () => {
    const base = mergeImportedLedgerEntries(undefined, undated2023);
    expect(detectUndatedImportedEntries(base, dated2024)).toEqual({
      incomingYear: 2024,
      undatedCount: 1,
    });
  });

  it("被本次取代的那筆不算(它已經有年度了,不是懸而未決的)", () => {
    const base = mergeImportedLedgerEntries(undefined, undated2023);
    const warning = detectUndatedImportedEntries(base, dated2024);
    // Info: (20260828 - Emily) 總公司被同鍵取代,只剩舊廠 —— 算 2 筆就是把已解決的也報出來
    expect(warning?.undatedCount).toBe(1);
  });

  it("**不借用 pending**:合併結果的待補清單一項都不多(追加回饋)", () => {
    const base = mergeImportedLedgerEntries(undefined, undated2023);
    const after = mergeImportedLedgerEntries(base, dated2024);
    expect(after.pending).toEqual([]);
  });

  it("警示不改變合併行為(不猜年度 → 舊廠仍在、總量仍是舊規則)", () => {
    const base = mergeImportedLedgerEntries(undefined, undated2023);
    const after = mergeImportedLedgerEntries(base, dated2024);

    expect(
      after.entries.some((entry) => entry.importedOrigin?.site === "(2) 舊廠"),
    ).toBe(true);
    expect(after.totalCo2eKg).toBe("1800000");
  });

  it("重匯不會愈積愈多(它是一個狀態,不是一份清單)", () => {
    const base = mergeImportedLedgerEntries(undefined, undated2023);
    const once = mergeImportedLedgerEntries(base, dated2024);
    expect(detectUndatedImportedEntries(once, dated2024)).toEqual({
      incomingYear: 2024,
      undatedCount: 1,
    });
  });

  it("本次匯入也沒有年度時不提(那是舊世界的正常狀態,不是異常)", () => {
    const base = mergeImportedLedgerEntries(undefined, undated2023);
    expect(
      detectUndatedImportedEntries(base, [
        importedEntry("(1) 總公司", "1100000"),
      ]),
    ).toBeNull();
  });

  it("帳本裡每一筆都有年度時不提(修法生效的正常路徑)", () => {
    const base = mergeImportedLedgerEntries(undefined, [
      importedEntry("(1) 總公司", "1000000", 2023),
    ]);
    expect(detectUndatedImportedEntries(base, dated2024)).toBeNull();
  });
});

/**
 * Info: (20260828 - Emily) 第五個偵測器要進 queryAnomalies 的列舉(追加回饋)。
 *
 * 「問得到」才算說出來:偵測器的產物若只存在 state 裡而沒進事實包,
 * 使用者問「有沒有異常」時系統仍然答不出來 —— 那就回到修法之前。
 */
describe("年度標註不完整是列舉制的第五個偵測器(追加回饋)", () => {
  const ledger = mergeImportedLedgerEntries(undefined, [
    importedEntry("(1) 總公司", "1000000"),
  ]);

  it("有警示時答得出來,而且 label 講實話(不是「待補項」)", () => {
    const result = queryAnomalies(ledger, undefined, {
      incomingYear: 2024,
      undatedCount: 1,
    });
    expect(result.ok).toBe(true);
    const fact = result.ok
      ? result.facts.find((item) => item.label.includes("年度標註不完整"))
      : undefined;
    expect(fact).toBeDefined();
    expect(fact?.label).not.toContain("待補項");
    expect(fact?.value).toContain("虛增");
    expect(fact?.value).toContain("2024");
    expect(fact?.source).toContain("年度歸屬");
  });

  it("沒有警示時不生事實(「查過而無異常」與「沒查」要分得出來)", () => {
    const result = queryAnomalies(ledger);
    expect(result.ok).toBe(true);
    expect(
      result.ok &&
        result.facts.some((item) => item.label.includes("年度標註不完整")),
    ).toBe(false);
  });

  it("不佔用待補計數(pending 的語意沒被冒用)", () => {
    const result = queryAnomalies(ledger, undefined, {
      incomingYear: 2024,
      undatedCount: 1,
    });
    expect(
      result.ok &&
        result.facts.filter((item) => item.label.startsWith("待補項")),
    ).toHaveLength(0);
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

/**
 * Info: (20260827 - Emily) 年度的**接線**(PR #6725 round-2 §1.7)。
 *
 * 上面那些條目都直接餵分錄給純函式 —— 它們證明「合併規則對」,
 * 但把 `year: inventoryYearRef.current` 改成 `year: undefined` 之後它們全綠:
 * 分錄根本不會經過 hook。而年度沒被帶進去的後果,正好等於這個修法不存在
 * (每一筆都變成年度未知 → 規則 3 永遠不成立 → 孤兒列照留)。
 *
 * 沒有 jsdom 就跑不了 hook,所以判準取源碼的接線形狀 ——
 * 這條回答的是「有沒有接上」,不宣稱驗了行為(§1.11)。
 */
describe("年度的接線:hook 真的把年度帶進匯入(round-2 §1.7)", () => {
  const hook = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
    "utf-8",
  );

  it("buildImportedLedger 收到 inventoryYearRef 的當下值", () => {
    expect(hook).toContain("year: inventoryYearRef.current");
  });

  it("inventoryYearRef 有鏡像 activeInventoryState.year(否則它永遠是 undefined)", () => {
    expect(hook).toContain(
      "inventoryYearRef.current = activeInventoryState?.year",
    );
  });

  it("年度快照存那份報告的分錄,不是累積後的帳本(R1 第二項的接線)", () => {
    expect(hook).toContain("buildYearSnapshot(entries)");
    // Info: (20260827 - Emily) 舊形狀:[base.year]: merged —— 存累積結果會讓 2023 的快照含 2024
    expect(hook).not.toContain("[base.year]: merged");
  });

  it("年度警示存進 state 而不是 ledger.pending(追加回饋的接線)", () => {
    expect(hook).toContain("detectUndatedImportedEntries(");
    expect(hook).toContain("ledgerYearWarning: yearWarning ?? undefined");
  });

  it("年度警示隨事實包注入(否則問「有沒有異常」還是答不出來)", () => {
    expect(hook).toContain("?.ledgerYearWarning,");
  });

  it("阻擋紀錄不在「完全沒入帳」的分支裡收集(round-2 低-1)", () => {
    /**
     * Info: (20260827 - Emily) 舊形狀是 `else { const blocks = ... }`。
     * 收集必須在條件之外,否則部分成功時被擋那半一筆紀錄都不留。
     */
    const applyIndex = hook.indexOf(
      "applyImportedLedgerEntries(importedEntries)",
    );
    const blocksIndex = hook.indexOf(
      "const blocks = Array.from(importedLedgerById.entries())",
    );
    expect(blocksIndex).toBeGreaterThan(0);
    expect(blocksIndex).toBeLessThan(applyIndex);
  });

  /**
   * Info: (20260828 - Emily) 低-1 的第二半(追加回饋):無條件收集只改了一半 ——
   * 部分成功時圖表走的是 switch,而 switch 原本一個字都不提被擋的那半。
   * 這條釘「圖表路徑吃得到附註」與「文案接了 i18n」——
   * 後者是本專案踩過兩次的坑:只改 default 沒接 i18n = 紙上什麼都不印。
   */
  it("圖表在有阻擋紀錄時會附註,且文案接了 i18n(低-1 第二半)", () => {
    const builder = fs.readFileSync(
      path.join(process.cwd(), "src/lib/carbon_report_chart.builder.ts"),
      "utf-8",
    );
    expect(builder).toContain("const wrapChart = ");
    expect(builder).toContain("partialImportBlocked");
    // Info: (20260828 - Emily) 舊形狀:switch 的每一格直接 wrap(...),附註沒有落點
    expect(builder).not.toContain("return wrap(buildScopePie(");
    expect(hook).toContain("carbon_chatbot.chart_partial_import_blocked");
  });
});
