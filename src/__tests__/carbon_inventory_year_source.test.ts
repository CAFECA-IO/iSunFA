import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  isStorableInventoryYear,
  normalizeInventoryYear,
  resolveIdentityYearPrefill,
} from "@/lib/utils/inventory_year";
import {
  INVENTORY_YEAR_MIN,
  INVENTORY_YEAR_STORAGE_MAX,
} from "@/constants/carbon_chatbot";
import { buildImportedLedger } from "@/lib/carbon_table38.pipeline";
import {
  buildYearSnapshot,
  mergeImportedLedgerEntries,
  resolveIncomingYear,
} from "@/lib/carbon_ledger_totals";
import type { ICarbonSourceTable } from "@/lib/carbon_source_table.builder";
import type {
  IComputedLedger,
  IComputedLedgerEntry,
} from "@/types/carbon_chatbot.types";

/**
 * Info: (20260902 - Emily) 盤查年度的來源(issue_drafts/open/69,PR #6725 review R1 拆出)。
 *
 * 修法之前:跨年度換鍋(規則 3)、`ledgerByYear` 快照、年間比較三個機制都做好了,
 * 但它們的輸入 —— 年度 —— 在真實路徑上永遠是同一個值:
 * `buildImportedLedger` 收的是房間層 `state.year`(write-once,匯入路徑不帶年度進來),
 * 於是同一間房匯入兩份不同年度的報告拿到同一個年度,三個機制一起空轉。
 *
 * 修法把年度改成「**那份報告**的年度」:萃取當預填 → 預覽卡確認 → 帳本只吃確認值。
 */

describe("盤查年度的裁決:抽錯比抽不到嚴重", () => {
  it("四位西元照收,前後的非數字字樣不影響", () => {
    expect(normalizeInventoryYear("2024", 2026)).toBe(2024);
    expect(normalizeInventoryYear(" 2024 ", 2026)).toBe(2024);
    expect(normalizeInventoryYear("2024年", 2026)).toBe(2024);
    expect(normalizeInventoryYear("盤查年度:2024", 2026)).toBe(2024);
  });

  it("民國年退回,**不在程式裡 +1911**", () => {
    /**
     * Info: (20260902 - Emily) 三位數字也可能是頁碼、表號或模型截斷的產物,
     * 而換算會把「抄錯」變成一個看起來很正常的年度 —— 那正是這張票要修的東西
     * (錯的年度會靜默改變哪些分錄被剔除,畫面上看不出異狀)。
     * prompt 已要求模型自己換算;它沒照做就是沒抽到,交給使用者填。
     */
    expect(normalizeInventoryYear("113", 2026)).toBeUndefined();
    expect(normalizeInventoryYear("民國113年", 2026)).toBeUndefined();
  });

  it("兩個年度退回:歸屬本身有歧義時由使用者裁決,不由我們挑一個", () => {
    expect(normalizeInventoryYear("2023-2024", 2026)).toBeUndefined();
    expect(normalizeInventoryYear("2023、2024", 2026)).toBeUndefined();
    expect(normalizeInventoryYear("2024/01/01", 2026)).toBeUndefined();
  });

  it("空字串與未回報都是「沒抽到」", () => {
    expect(normalizeInventoryYear("", 2026)).toBeUndefined();
    expect(normalizeInventoryYear(undefined, 2026)).toBeUndefined();
  });

  it("範圍外退回(盤查報告不會早於下限,也不會晚於明年)", () => {
    expect(normalizeInventoryYear(String(INVENTORY_YEAR_MIN), 2026)).toBe(
      INVENTORY_YEAR_MIN,
    );
    expect(
      normalizeInventoryYear(String(INVENTORY_YEAR_MIN - 1), 2026),
    ).toBeUndefined();
    expect(normalizeInventoryYear("2027", 2026)).toBe(2027);
    expect(normalizeInventoryYear("2028", 2026)).toBeUndefined();
  });
});

/**
 * Info: (20260902 - Emily) 完成判準,照 when 子句寫(issue_drafts/open/69):
 * **兩份不同年度的報告依序進入** →
 * `ledgerByYear` 有兩個鍵、各鍵分錄不互相污染、當前帳本總量等於後一份報告。
 *
 * 年度在這裡走的是真實的轉換鏈:表3.8 原文 markdown → `buildImportedLedger`
 * → `importedOrigin.year` → 合併與快照。手寫兩個年度餵純函式證明不了這件事
 * (那正是 R1 未完成時 §1.4 指出的形狀:fixture 不是真實資料的形狀)。
 *
 * hook 那三行膠水(resolveIncomingYear / merge / buildYearSnapshot)在這裡以
 * 同樣的順序重現,而「hook 真的呼叫這三個」由
 * `carbon_cross_year_ledger.test.ts` 的接線掃描釘住 —— 沒有 jsdom,
 * 兩者分工:這裡驗行為,那裡驗接線(§1.11)。
 */
describe("完成判準:兩份不同年度的報告依序進入", () => {
  const table38 = (rows: { site: string; tonne: string }[]): string =>
    [
      "| 公司 | 報告邊界類型 | 報告邊界 | 溫室氣體排放量 (公噸 CO2e/年) | 溫室氣體排放量各類別總和 (公噸 CO2e/年) |",
      "| --- | --- | --- | --- | --- |",
      ...rows.map(
        (row) =>
          `| ${row.site} | 類別二 | 2.1 外購電力 | ${row.tonne} | ${row.tonne} |`,
      ),
    ].join("\n");

  const sourceTable = (
    rows: { site: string; tonne: string }[],
  ): ICarbonSourceTable => ({
    tableNo: "表3.8",
    caption: "溫室氣體排放量彙整表",
    sourcePages: [42],
    markdown: table38(rows),
  });

  const reportEntries = (
    year: number,
    rows: { site: string; tonne: string }[],
  ): IComputedLedgerEntry[] =>
    buildImportedLedger({ sourceTables: [sourceTable(rows)], year }).entries;

  /**
   * Info: (20260902 - Emily) hook 在 applyImportedLedgerEntries 裡做的三件事,
   * 順序與呼叫一模一樣(見 use_carbon_chat.ts):年度只判一次,
   * 合併與快照共用它 —— 三處各自判年度會出現「剔除了 2023、快照存到 2024」。
   */
  const applyImport = (
    state: {
      computedLedger?: IComputedLedger;
      ledgerByYear: Record<number, IComputedLedger>;
    },
    entries: IComputedLedgerEntry[],
  ): void => {
    const incomingYear = resolveIncomingYear(entries);
    state.computedLedger = mergeImportedLedgerEntries(
      state.computedLedger,
      entries,
    );
    if (incomingYear !== undefined) {
      state.ledgerByYear = {
        ...state.ledgerByYear,
        [incomingYear]: buildYearSnapshot(entries),
      };
    }
  };

  const twoReports = (): {
    computedLedger?: IComputedLedger;
    ledgerByYear: Record<number, IComputedLedger>;
  } => {
    const state: {
      computedLedger?: IComputedLedger;
      ledgerByYear: Record<number, IComputedLedger>;
    } = { ledgerByYear: {} };
    // Info: (20260902 - Emily) 2023:總公司 + 一個 2024 年已關掉的舊廠
    applyImport(
      state,
      reportEntries(2023, [
        { site: "(1) 總公司", tonne: "1000.0000" },
        { site: "(2) 舊廠", tonne: "400.0000" },
      ]),
    );
    // Info: (20260902 - Emily) 2024:總公司數字變了,舊廠不見了,換成一個新廠
    applyImport(
      state,
      reportEntries(2024, [
        { site: "(1) 總公司", tonne: "1100.0000" },
        { site: "(3) 新廠", tonne: "300.0000" },
      ]),
    );
    return state;
  };

  it("兩份報告都真的帶著自己的年度進來(不是同一個值)", () => {
    expect(
      resolveIncomingYear(
        reportEntries(2023, [{ site: "(1) 總公司", tonne: "1.0000" }]),
      ),
    ).toBe(2023);
    expect(
      resolveIncomingYear(
        reportEntries(2024, [{ site: "(1) 總公司", tonne: "1.0000" }]),
      ),
    ).toBe(2024);
  });

  it("ledgerByYear 有兩個鍵", () => {
    const state = twoReports();
    expect(Object.keys(state.ledgerByYear).map(Number).sort()).toEqual([
      2023, 2024,
    ]);
  });

  it("各鍵的分錄不互相污染", () => {
    const state = twoReports();
    const sites = (year: number): string[] =>
      (state.ledgerByYear[year]?.entries ?? [])
        .map((entry) => entry.importedOrigin?.site ?? "")
        .sort();
    expect(sites(2023)).toEqual(["(1) 總公司", "(2) 舊廠"]);
    expect(sites(2024)).toEqual(["(1) 總公司", "(3) 新廠"]);
  });

  it("當前帳本總量等於後一份報告的總量(孤兒列不留)", () => {
    const state = twoReports();
    const second = buildYearSnapshot(
      reportEntries(2024, [
        { site: "(1) 總公司", tonne: "1100.0000" },
        { site: "(3) 新廠", tonne: "300.0000" },
      ]),
    );
    expect(state.computedLedger?.totalCo2eKg).toBe(second.totalCo2eKg);
  });

  it("2024 年已不存在的廠不在當前帳本裡", () => {
    const state = twoReports();
    const sites = (state.computedLedger?.entries ?? []).map(
      (entry) => entry.importedOrigin?.site ?? "",
    );
    expect(sites).not.toContain("(2) 舊廠");
  });

  it("兩份報告都沒有年度時退回舊行為(不猜:孤兒列照留)", () => {
    /**
     * Info: (20260902 - Emily) 這條是界線:修法沒有把「不猜」改成「猜」。
     * 年度未知時規則 3 不成立,舊廠仍在帳本裡 —— 那是既有帳本升版後的處境,
     * 由年度警示(detectUndatedImportedEntries)負責說出來,不是靜靜地剔除。
     */
    const state: {
      computedLedger?: IComputedLedger;
      ledgerByYear: Record<number, IComputedLedger>;
    } = { ledgerByYear: {} };
    applyImport(
      state,
      buildImportedLedger({
        sourceTables: [
          sourceTable([
            { site: "(1) 總公司", tonne: "1000.0000" },
            { site: "(2) 舊廠", tonne: "400.0000" },
          ]),
        ],
      }).entries,
    );
    applyImport(
      state,
      buildImportedLedger({
        sourceTables: [
          sourceTable([{ site: "(1) 總公司", tonne: "1100.0000" }]),
        ],
      }).entries,
    );
    const sites = (state.computedLedger?.entries ?? []).map(
      (entry) => entry.importedOrigin?.site ?? "",
    );
    expect(sites).toContain("(2) 舊廠");
    expect(Object.keys(state.ledgerByYear)).toHaveLength(0);
  });
});

/**
 * Info: (20260902 - Emily) 萃取端與確認端的接線(沒有 jsdom,只宣稱「條文在不在」)。
 */
describe("年度的來源接線", () => {
  const service = fs.readFileSync(
    path.join(process.cwd(), "src/services/report_import.service.ts"),
    "utf-8",
  );
  const preview = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/carbon_chatbot/import_preview.tsx",
    ),
    "utf-8",
  );

  it("年度與 activities 同掛在第一次呼叫(逐章十一次各回一個年度會變成新的裁決題)", () => {
    const withActivities = service.indexOf("if (withActivities) {");
    const yearProperty = service.indexOf("properties.inventoryYear = {");
    const schemaReturn = service.indexOf('required: ["segments", "unmapped"]');
    expect(withActivities).toBeGreaterThan(-1);
    expect(yearProperty).toBeGreaterThan(withActivities);
    expect(yearProperty).toBeLessThan(schemaReturn);
  });

  it("萃取結果只當預填:服務層回報的是裁決後的值", () => {
    expect(service).toContain("normalizeInventoryYear(parsed.inventoryYear)");
    expect(service).toContain(
      "return { segments, unmapped, activities, inventoryYear };",
    );
  });

  it("被退掉的年度留痕(現場要分得開「模型回空字串」與「回了但被裁決退掉」)", () => {
    expect(service).toContain("inventory year adjudicated");
  });

  it("逐章回應的型別宣告了年度(漏宣告等於靜默丟棄)", () => {
    /**
     * Info: (20260902 - Emily) 這個坑在同一個介面上發生過一次:`sourceTables`
     * API 一直有回,而型別漏宣告 → 逐章合併只搬它認得的欄位 → 表格一張都沒進過報告,
     * 畫面上毫無異狀。年度的失敗形狀一樣,而且更難察覺(它不長在畫面上)。
     */
    const hook = fs.readFileSync(
      path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
      "utf-8",
    );
    const chunkInterface = hook.indexOf("interface IImportChunkPayload {");
    const chunkInterfaceEnd = hook.indexOf("\n      }", chunkInterface);
    expect(chunkInterface).toBeGreaterThan(-1);
    expect(hook.slice(chunkInterface, chunkInterfaceEnd)).toContain(
      "inventoryYear?: number",
    );
  });

  it("逐章合併不覆蓋年度:後到的 undefined 不能蓋掉第一個抽到的", () => {
    /**
     * Info: (20260902 - Emily) 只有第一次呼叫會要求模型回年度,其餘十次是 undefined。
     * 寫成賦值就會被蓋掉,而那等於這張票沒做(年度回到未知 → 規則 3 不成立)。
     * 與 activities 那條「累加而不是覆蓋」是同一個教訓的另一半。
     */
    /**
     * Info: (20260903 - Luphia) 摺疊搬進 `use_carbon_chat.helpers`(rebase 到 develop):
     * develop 把那段 inline 迴圈抽成 `foldImportChunks`,規則因此住在 helper 裡 ——
     * 掃描要跟著搬,否則它守的是一段不存在的程式碼。
     */
    const helpers = fs.readFileSync(
      path.join(process.cwd(), "src/hooks/use_carbon_chat.helpers.ts"),
      "utf-8",
    );
    expect(helpers).toContain(
      "if (inventoryYear === undefined && chunk.inventoryYear !== undefined)",
    );
    // Info: (20260903 - Luphia) 摺疊結果要真的被用上,否則規則住在 helper 也沒人讀
    const hook = fs.readFileSync(
      path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
      "utf-8",
    );
    expect(hook).toContain("inventoryYear: folded.inventoryYear");
  });

  it("預覽卡只在這次匯入會產生帳本分錄時要求年度", () => {
    /**
     * Info: (20260902 - Emily) 一律必填會讓純文字章節的匯入被一個與它無關的欄位擋住 ——
     * 那是新的缺陷,不是更嚴格的把關。判準用表號,而表號取自產帳本的那支純函式。
     */
    expect(preview).toContain("LEDGER_SOURCE_TABLE_NO");
    expect(preview).toContain("ledgerBearingChecked");
    expect(preview).toContain("disabled={checkedCount === 0 || yearMissing}");
  });

  /**
   * Info: (20260903 - Luphia) 兩個判斷都在 lib,hook 只負責呼叫(review)。
   * 判斷本身的逐條測試在下方兩個 describe;這裡只回答「有沒有接上」(§1.11)。
   */
  it("寫入點呼叫共用的守門,不在 hook 裡自己寫一份界", () => {
    const hook = fs.readFileSync(
      path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
      "utf-8",
    );
    expect(hook).toContain("isStorableInventoryYear(year)");
    expect(hook).toContain("resolveIdentityYearPrefill(");
    // Info: (20260903 - Luphia) 反面:hook 裡再出現界的比較就是又寫了一份
    expect(hook).not.toContain("year >= INVENTORY_YEAR_MIN");
  });

  it("晚到的預填不蓋掉使用者手上打的字(#6730 第二輪那條的同一個形狀)", () => {
    expect(preview).toContain("current.trim().length > 0 ? current :");
  });

  /**
   * Info: (20260903 - Luphia) 這一條原本斷言 `/^\d{4}$/` —— 也就是把缺陷釘成了正確
   *(review 阻-2)。那個閘沒有範圍,而下游每一道都有,於是 `1024` 存得進去、
   * 下次載入時整份盤查狀態被 fail-fast 丟棄。
   *
   * 現在釘的是「畫面與萃取端**共用同一支裁決**」;值域關係本身由
   * `carbon_inventory_state_persistence.test.ts` 的不變式測試守
   *(輸入端能產出的年度,儲存端一定讀得回來)。掃描只回答接線,不回答值域。
   */
  it("打到一半不會被當成年度送進帳本,而且裁決與萃取端同一支", () => {
    expect(preview).toContain(
      "onChangeInventoryYear(normalizeInventoryYear(e.target.value))",
    );
    expect(preview).toContain('from "@/lib/utils/inventory_year"');
    /**
     * Info: (20260903 - Luphia) 反面也要釘:元件自己再寫一份無範圍的四位數判斷就是缺陷本身。
     * 錨在**呼叫**形狀(`.test(`)而不是 regex 本身 —— 註解裡會引用它來說明
     * 為什麼不這樣寫,而那不該讓這一條紅(§1.14 那條「錨在短而獨特的子字串」)。
     */
    expect(preview).not.toContain("/^\\d{4}$/.test(");
  });
});

/**
 * Info: (20260903 - Luphia) 寫入點的守門與識別欄位的預填(review 阻-2 與不阻擋項)。
 *
 * 兩個判斷原本寫在 hook 裡,而 hook 在這個 repo 測不到(jest 是 node 環境、
 * 沒有 jsdom),於是把它們改壞不會有任何測試變紅 —— mutation 實測全綠。
 * 抽成純函式之後逐條測得到;hook 只剩「有沒有呼叫」由下方掃描守。
 */
describe("寫入點的守門:儲存讀得回來的年度才收", () => {
  it("範圍內收下", () => {
    expect(isStorableInventoryYear(INVENTORY_YEAR_MIN)).toBe(true);
    expect(isStorableInventoryYear(2024)).toBe(true);
    expect(isStorableInventoryYear(INVENTORY_YEAR_STORAGE_MAX)).toBe(true);
  });

  it("範圍外退回(這幾個值會讓整份盤查狀態在下次載入時被丟棄)", () => {
    [0, 1989, 2101, 9999].forEach((year) => {
      expect(isStorableInventoryYear(year)).toBe(false);
    });
  });

  it("非整數與未填退回", () => {
    expect(isStorableInventoryYear(2024.5)).toBe(false);
    expect(isStorableInventoryYear(Number.NaN)).toBe(false);
    expect(isStorableInventoryYear(undefined)).toBe(false);
  });
});

describe("報告識別那格的單向預填", () => {
  it("空的才填", () => {
    expect(resolveIdentityYearPrefill(undefined, 2024)).toBe("2024");
    expect(resolveIdentityYearPrefill("", 2024)).toBe("2024");
    expect(resolveIdentityYearPrefill("   ", 2024)).toBe("2024");
  });

  /**
   * Info: (20260903 - Luphia) 這一條是本組唯一真正需要守的行為:
   * 那格是自由文字、逐字印在報告第一頁,「2023 年度」是合法寫法。
   * 覆蓋它等於替使用者改掉要印出去的字。
   */
  it("已經有字就不動它(即使兩者不一致)", () => {
    expect(resolveIdentityYearPrefill("2023", 2024)).toBeUndefined();
    expect(resolveIdentityYearPrefill("2023 年度", 2023)).toBeUndefined();
    expect(resolveIdentityYearPrefill("民國112年", 2023)).toBeUndefined();
  });

  it("沒有確認過的年度就不寫", () => {
    expect(resolveIdentityYearPrefill(undefined, undefined)).toBeUndefined();
    expect(resolveIdentityYearPrefill("", undefined)).toBeUndefined();
  });
});
