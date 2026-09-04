import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { CarbonInventoryStateSchema } from "@/validators";
import { normalizeInventoryYear } from "@/lib/utils/inventory_year";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import { MeasurementUnit } from "@/constants/enums";
import {
  EmissionBasisEnum,
  LedgerProvenanceEnum,
} from "@/constants/imported_quantity";

/**
 * Info: (20260903 - Emily) 盤查狀態存得下來 —— 以「往返」為判準。
 *
 * ## 為什麼是往返而不是比對欄位清單
 *
 * `loadInventoryState` 回傳的是 `CarbonInventoryStateSchema.safeParse(...).data`,
 * 而 **zod 物件 schema 預設剝掉未宣告的鍵**。這個檔案已經被這件事咬過兩次:
 *
 * 1. 2026-08-07:`provenance` / `emissionBasis` / `importedOrigin` 在型別上有、
 *    schema 沒宣告 → 存檔那一刻消失 → 重載後 33 列「原文照錄」被改寫成「系統計算」。
 * 2. 本 PR:`importedOrigin.year` 加在**上面那段註解的正下方**,同樣沒進 schema。
 *
 * 兩次都在**巢狀**(`computedLedger.entries[]` 與其 `importedOrigin`)——
 * 所以「比對頂層欄位清單」這種護欄對兩次都會照綠。往返比對不挑層級,
 * 巢狀免費涵蓋:序列化 → 過 schema → 必須與原物件完全相同。
 *
 * ## 為什麼不是 `.passthrough()`
 *
 * schema 檔頭明寫「壞資料 Fail Fast 丟棄,不入 React 狀態」——
 * 放寬成 passthrough 等於把驗證讓掉。真正的教訓是
 * **strip-by-default 讓「忘記宣告」變成靜默資料遺失,而不是一個錯誤**。
 * 所以修法是讓欄位存得下來 + 讓漏宣告會紅,不是改掉那個預設。
 *
 * ## 這支測試的職權:往返等價,不是「欄位有沒有宣告」
 *
 * 「宣告對齊」有更根本的修法(schema 當單一來源、型別用 `z.infer` 推出來,
 * 那時候「忘記宣告」這個動作不存在)。**那個修法落地之後,這支測試不是冗餘的** ——
 * 它保證的是另一個性質:**序列化往返之後等價**,而 `z.infer` 不保證那件事。
 *
 * 最典型的例子就是本次新增的 `ledgerByYear: Record<number, IComputedLedger>`:
 * JSON 的物件鍵一律是字串,`JSON.parse` 之後鍵是 `"2023"` 而不是 `2023`。
 * 型別說 number,而 `z.infer` 眼中兩邊「對得上」—— 但往返之後鍵的實際型別
 * 與型別註解不一致。JS 的隱式轉換讓 `ledgerByYear[state.year]` 照樣取得到值,
 * 所以它不會壞,它會**安靜地不一致**,直到有人寫出 `Object.keys(...).map(Number)`
 * 之外的東西。下面那條「年度快照的鍵沒有掉」釘的就是這個事實(`["2023"]`)。
 *
 * 所以:宣告對齊歸 `z.infer`,往返等價歸這裡,兩者不重疊。
 * **單一來源落地之後不要把這支當冗餘刪掉。**
 *
 * ## 為什麼漏一個欄位會毀資料(不只是失效)
 *
 * 寫路徑 `saveInventoryState` 存的是 `JSON.stringify(state)`,**不過 schema**;
 * 讀路徑會剝。而 hook 把 `parsed.data` 直接放進 state,
 * 於是**重載後的第一次存檔會把剝掉欄位的版本寫回伺服器** ——
 * 那一刻資料就永久沒了,事後補 schema 也救不回來。
 */

const importedEntry = {
  activityKey: "imported:LOCATION:(1) 總公司:2.1 外購電力",
  scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
  sourceName: "(1) 總公司 2.1 外購電力",
  quantityRaw: "1000.0000",
  convertedQuantity: "1000.0000",
  convertedUnit: MeasurementUnit.TONNE,
  co2eKg: "1000000",
  factor: {
    factorId: "imported:3.8",
    name: "不適用(原文照錄)",
    value: "—",
    unit: MeasurementUnit.TONNE,
    source: "3.8",
  },
  provenance: LedgerProvenanceEnum.IMPORTED,
  emissionBasis: EmissionBasisEnum.LOCATION,
  importedOrigin: {
    site: "(1) 總公司",
    isoCategory: Iso14064Category.CATEGORY_2,
    subCategory: "2.1 外購電力",
    tableNo: "3.8",
    year: 2023,
  },
};

const ledger = {
  entries: [importedEntry],
  pending: [],
  scopeSubtotals: {},
  totalCo2eKg: "1000000",
  computedAt: "2026-09-03T00:00:00.000Z",
};

const fullState = {
  step: CarbonInventoryStep.ORG_PROFILE,
  company: "高興昌鋼鐵股份有限公司",
  year: 2023,
  activities: [],
  computedLedger: ledger,
  ledgerByYear: { 2023: ledger },
  ledgerYearWarning: { incomingYear: 2024, undatedCount: 3 },
  notes: [],
  updatedAt: "2026-09-03T00:00:00.000Z",
  version: 1,
};

const roundTrip = (state: unknown): unknown => {
  const wire = JSON.parse(JSON.stringify(state));
  const parsed = CarbonInventoryStateSchema.safeParse(wire);
  if (!parsed.success) {
    throw new Error(
      "schema 拒絕了這份狀態:" +
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}:${issue.code}`)
          .join(", "),
    );
  }
  return parsed.data;
};

describe("盤查狀態的往返:序列化 → schema → 必須一模一樣", () => {
  it("整份狀態往返之後完全相同(巢狀一併涵蓋)", () => {
    const wire = JSON.parse(JSON.stringify(fullState));
    expect(roundTrip(fullState)).toEqual(wire);
  });

  it("匯入分錄的盤查年度倖存(本 PR 新增的那一行)", () => {
    /**
     * Info: (20260903 - Emily) 判準不是「年度等於 2023」,而是「年度這個鍵還在」——
     * 缺 schema 宣告時它會是 undefined,而規則 3 拿到 undefined 就不剔除,
     * 跨年度孤兒列全部保留(實測虛增 28.6%)。
     */
    const back = roundTrip(fullState) as typeof fullState;
    expect(back.computedLedger.entries[0].importedOrigin).toHaveProperty(
      "year",
    );
    expect(back.computedLedger.entries[0].importedOrigin.year).toBe(2023);
  });

  it("年度快照的鍵沒有掉,且值是那一年自己的帳本", () => {
    const back = roundTrip(fullState) as typeof fullState;
    expect(Object.keys(back.ledgerByYear)).toEqual(["2023"]);
    expect(back.ledgerByYear[2023].totalCo2eKg).toBe("1000000");
  });

  it("年度警示倖存(它只在匯入時寫入,載入路徑不重算,掉了不會自己回來)", () => {
    const back = roundTrip(fullState) as typeof fullState;
    expect(back.ledgerYearWarning).toEqual({
      incomingYear: 2024,
      undatedCount: 3,
    });
  });

  it("舊紀錄(沒有這些新鍵)仍然讀得出來", () => {
    /**
     * Info: (20260903 - Emily) 這條是界線:新欄位一律選填。
     * 必填會讓既有的盤查狀態在下一次載入時整份被丟棄
     * (safeParse 失敗 → `state: null` → 使用者的帳本看起來像消失了)。
     */
    const legacy = {
      step: CarbonInventoryStep.ORG_PROFILE,
      activities: [],
      updatedAt: "2026-08-01T00:00:00.000Z",
      version: 1,
    };
    expect(roundTrip(legacy)).toEqual(legacy);
  });

  it("schema 檔頭仍然主張 Fail Fast(否則往返這條就失去意義)", () => {
    /**
     * Info: (20260903 - Emily) 如果有人把 schema 改成 `.passthrough()`,
     * 上面每一條都會自動變綠 —— 護欄會在無聲中失效。
     * 所以這裡釘住「沒有 passthrough」這個前提本身。
     */
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/validators/carbon_inventory.ts"),
      "utf-8",
    );
    const i = src.indexOf("export const CarbonInventoryStateSchema");
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i, i + 4000)).not.toContain("passthrough");
  });
});

/**
 * Info: (20260903 - Luphia) 輸入端與儲存端的**值域關係**(review;PR #6743 阻-2)。
 *
 * 這是本檔往返判準的延伸,也是那條缺陷唯一測得出來的形狀:
 * 缺陷不在任何一支函式裡,而在兩道閘的**值域**上 ——
 * 預覽卡原本只驗 `/^\d{4}$/`(無範圍),而儲存 schema 是 1990..2100,
 * 於是 `1024`(`2024` 的手滑)存得進去、下次 `safeParse` 失敗、
 * `loadInventoryState` fail-fast 回 null,**整份盤查狀態被丟棄**。
 *
 * 判準寫成不變式而不是逐案例斷言:**輸入端能產出的年度,儲存端一定讀得回來。**
 * 這樣下一個人改寬任何一邊都會紅,而不必先想到 `1024` 這個例子。
 *
 * 反向驗過:把預覽卡的裁決換回 `/^\d{4}$/`(或拿掉 normalizeInventoryYear
 * 的範圍檢查)→ 這一條紅。
 */
describe("輸入端的值域 ⊆ 儲存端的值域(年度)", () => {
  const TYPED = [
    "",
    "2",
    "202",
    "0000",
    "1024",
    "1989",
    "1990",
    "2024",
    "2100",
    "9999",
    "2024年",
    "民國113年",
    "2023-2024",
  ];

  it("預覽卡能送出的每一個年度,過完 schema 都讀得回來", () => {
    const accepted = TYPED.map((typed) =>
      normalizeInventoryYear(typed, 2026),
    ).filter((year): year is number => year !== undefined);
    // Info: (20260903 - Luphia) 至少要有一個被收下,否則這條會空跑而看起來是綠的
    expect(accepted.length).toBeGreaterThan(0);
    accepted.forEach((year) => {
      const state = {
        ...fullState,
        computedLedger: {
          ...ledger,
          entries: [
            {
              ...importedEntry,
              importedOrigin: { ...importedEntry.importedOrigin, year },
            },
          ],
        },
        ledgerByYear: undefined,
      };
      expect(() => roundTrip(state)).not.toThrow();
    });
  });

  it("超出儲存範圍的年度確實會讓整份狀態被拒(這條紅字是那個後果的證據)", () => {
    [0, 1989, 2101, 9999].forEach((year) => {
      const state = {
        ...fullState,
        computedLedger: {
          ...ledger,
          entries: [
            {
              ...importedEntry,
              importedOrigin: { ...importedEntry.importedOrigin, year },
            },
          ],
        },
        ledgerByYear: undefined,
      };
      expect(() => roundTrip(state)).toThrow();
      // Info: (20260903 - Luphia) 而且它們送不出預覽卡 —— 兩件事一起才算守住
      expect(normalizeInventoryYear(String(year), 2026)).toBeUndefined();
    });
  });
});
