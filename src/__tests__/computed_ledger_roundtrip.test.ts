import { describe, it, expect } from "@jest/globals";
import { ComputedLedgerSchema } from "@/validators/carbon_inventory";
import { isImportedEntry } from "@/lib/carbon_table38.ledger";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import { LedgerProvenanceEnum } from "@/constants/imported_quantity";

/**
 * Info: (20260807 - Emily) 帳本存檔往返不得掉欄位
 * (issue_drafts/inventory_table_import/16)。
 *
 * 這支測試之所以存在:`provenance` 與 `importedOrigin` 在型別上有、在 schema 上沒有,
 * 而 zod 預設剝掉未宣告的鍵 —— 於是存檔那一刻出處就沒了,重載後
 * 33 列「原文照錄(表3.8)」全部變成「系統計算」。
 *
 * 數字沒變,所以畫面上看不出異常;而 schema 與型別的落差在編譯期也看不出來
 * (zod 不會因為少宣告一個 optional 欄位而報錯)。
 * 只有往返測試看得見 —— 所以它必須存在。
 */
describe("ComputedLedgerSchema 往返", () => {
  const importedEntry = {
    activityKey: "imported:屏東分公司:2.1",
    scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
    sourceName: "(1) 屏東分公司 2.1",
    quantityRaw: "0",
    convertedQuantity: "0",
    convertedUnit: "TONNE",
    co2eKg: "3325015.2",
    factor: {
      factorId: "imported",
      name: "原文照錄",
      value: "—",
      unit: "kgCO2e",
      source: "表3.8",
    },
    provenance: LedgerProvenanceEnum.IMPORTED,
    importedOrigin: {
      site: "屏東分公司",
      isoCategory: Iso14064Category.CATEGORY_2,
      subCategory: "2.1",
      tableNo: "表3.8",
    },
  };

  const ledger = {
    entries: [importedEntry],
    pending: [],
    scopeSubtotals: {
      [GhgProtocolCategory.SCOPE_2_INDIRECT]: "3325015.2",
    },
    totalCo2eKg: "3325015.2",
    computedAt: "2026-08-07T00:00:00.000Z",
  };

  it("should keep provenance through a save/restore round trip", () => {
    const parsed = ComputedLedgerSchema.parse(ledger);
    expect(parsed.entries[0].provenance).toBe(LedgerProvenanceEnum.IMPORTED);
  });

  it("should keep importedOrigin through a save/restore round trip", () => {
    const parsed = ComputedLedgerSchema.parse(ledger);
    expect(parsed.entries[0].importedOrigin).toEqual({
      site: "屏東分公司",
      isoCategory: Iso14064Category.CATEGORY_2,
      subCategory: "2.1",
      tableNo: "表3.8",
    });
  });

  /**
   * Info: (20260807 - Emily) 這一條才是使用者看得到的後果:
   * 出處掉了之後 `isImportedEntry` 回 false,表格就把外部已查證的數字
   * 標成「系統計算」,並印出從 CO2e 反推的活動數據。
   */
  it("should still be recognised as imported after the round trip", () => {
    const parsed = ComputedLedgerSchema.parse(ledger);
    expect(isImportedEntry(parsed.entries[0])).toBe(true);
  });

  it("should leave a computed entry without provenance alone", () => {
    // Info: (20260807 - Emily) 憑證計算路徑不帶 provenance —— 預設仍是 COMPUTED
    const computed = ComputedLedgerSchema.parse({
      ...ledger,
      entries: [
        {
          ...importedEntry,
          provenance: undefined,
          importedOrigin: undefined,
        },
      ],
    });
    expect(isImportedEntry(computed.entries[0])).toBe(false);
  });
});
