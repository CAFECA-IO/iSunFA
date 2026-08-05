// Info: (20260720 - Tzuhan) #23 報告數據表格產生器測試:決定性輸出、LLM 表格丟棄、注入/替換、凍結、徽章三態

import { describe, it, expect } from "@jest/globals";
import {
  buildCarbonDataTable,
  stripLlmTables,
  injectDataTable,
  hasInjectedDataTable,
  deriveDataBadgeState,
  CarbonDataBadgeStateEnum,
  CARBON_DATA_TABLE_START,
  CARBON_DATA_TABLE_END,
} from "@/lib/carbon_report_table.builder";
import {
  ArticulationStatusEnum,
  ArticulationViolationReasonEnum,
} from "@/constants/carbon_articulation";
import { GhgProtocolCategory } from "@/constants/esg";
import { LedgerProvenanceEnum } from "@/constants/imported_quantity";
import { IComputedLedger } from "@/types/carbon_chatbot.types";

const buildLedger = (
  overrides?: Partial<IComputedLedger>,
): IComputedLedger => ({
  entries: [
    {
      activityKey: "k1",
      scopeCategory: GhgProtocolCategory.SCOPE_2_INDIRECT,
      sourceName: "外購電力",
      quantityRaw: "2,500,000",
      convertedQuantity: "2500000",
      convertedUnit: "KWH",
      co2eKg: "1235000",
      factor: {
        factorId: "f1",
        name: "台電電力係數",
        value: "0.494",
        unit: "度(kwh)",
        source: "台灣電力公司 2024",
      },
    },
  ],
  pending: [],
  scopeSubtotals: {
    [GhgProtocolCategory.SCOPE_2_INDIRECT]: "1235000",
  },
  totalCo2eKg: "1235000",
  computedAt: "2026-07-20T00:00:00.000Z",
  ...overrides,
});

describe("buildCarbonDataTable", () => {
  it("should render engine figures verbatim with factor provenance (zero fabrication)", () => {
    const table = buildCarbonDataTable(buildLedger());
    // Info: (20260720 - Tzuhan) 數字與 #21 引擎產出精確一致(千分位格式化,無 number 運算)
    expect(table).toContain("1,235,000");
    expect(table).toContain("0.494");
    expect(table).toContain("台灣電力公司 2024");
    expect(table).toContain(CARBON_DATA_TABLE_START);
    expect(table).toContain(CARBON_DATA_TABLE_END);
    // Info: (20260720 - Tzuhan) 同輸入同輸出(決定性)
    expect(buildCarbonDataTable(buildLedger())).toBe(table);
  });

  it("should freeze the table with an audit warning on mass conservation violation", () => {
    const table = buildCarbonDataTable(
      buildLedger({
        articulation: {
          status: ArticulationStatusEnum.VIOLATED,
          violations: [
            {
              materialName: "柴油",
              unit: "LITER",
              reason:
                ArticulationViolationReasonEnum.MASS_GAP_EXCEEDS_TOLERANCE,
              expectedConsumption: "150",
              actualConsumption: "200",
              gap: "50",
            },
          ],
          warnings: [],
          checkedAt: "2026-07-20T00:00:00.000Z",
        },
      }),
    );
    expect(table).toContain("凍結");
    // Info: (20260720 - Tzuhan) 凍結時不得輸出任何數據表格列
    expect(table).not.toContain("| 外購電力");
  });

  it("should render an insufficiency placeholder instead of an empty table", () => {
    const table = buildCarbonDataTable(undefined);
    expect(table).toContain("資料不足");
    expect(table).not.toContain("| ---");
  });

  it("should note pending records excluded from the table", () => {
    const table = buildCarbonDataTable(
      buildLedger({
        pending: [
          { activityKey: "k2", sourceName: "柴油", reason: "NO_FACTOR_MATCH" },
        ],
      }),
    );
    expect(table).toContain("1 ");
    expect(table).toContain("待補係數");
  });
});

describe("stripLlmTables", () => {
  it("should drop LLM-fabricated tables but keep narrative and fenced code", () => {
    const content = [
      "本期排放概況說明。",
      "| 範疇 | 排放量 |",
      "| --- | --- |",
      "| Scope 1 | 999999 |",
      "```",
      "| 程式碼區塊內的表格照留 |",
      "```",
      "結尾敘述。",
    ].join("\n");
    const stripped = stripLlmTables(content);
    expect(stripped).not.toContain("999999");
    expect(stripped).toContain("本期排放概況說明。");
    expect(stripped).toContain("| 程式碼區塊內的表格照留 |");
    expect(stripped).toContain("結尾敘述。");
  });
});

describe("injectDataTable / hasInjectedDataTable", () => {
  it("should append when absent and replace in place on recompute (narrative untouched)", () => {
    const narrative = "敘述文字。";
    const v1 = injectDataTable(narrative, buildCarbonDataTable(buildLedger()));
    expect(hasInjectedDataTable(v1)).toBe(true);
    expect(v1.startsWith("敘述文字。")).toBe(true);

    // Info: (20260720 - Tzuhan) 重算後替換錨點區塊:敘述零改動,新數字生效
    // Info: (20260720 - Tzuhan) entries 明細也要換新值,否則明細列仍印舊 co2e(測試資料須自洽)
    const baseLedger = buildLedger();
    const updated = buildCarbonDataTable(
      buildLedger({
        entries: [{ ...baseLedger.entries[0], co2eKg: "999" }],
        totalCo2eKg: "999",
        scopeSubtotals: { S2: "999" },
      }),
    );
    const v2 = injectDataTable(v1, updated);
    expect(v2).toContain("999");
    expect(v2).not.toContain("1,235,000");
    expect(v2.startsWith("敘述文字。")).toBe(true);
    // Info: (20260720 - Tzuhan) 錨點只有一組(替換非疊加)
    expect(v2.split(CARBON_DATA_TABLE_START)).toHaveLength(2);
  });
});

describe("deriveDataBadgeState", () => {
  it("should adjudicate the three states deterministically", () => {
    expect(deriveDataBadgeState(undefined)).toBe(
      CarbonDataBadgeStateEnum.INSUFFICIENT,
    );
    expect(deriveDataBadgeState(buildLedger())).toBe(
      CarbonDataBadgeStateEnum.RECONCILED,
    );
    expect(
      deriveDataBadgeState(
        buildLedger({
          articulation: {
            status: ArticulationStatusEnum.VIOLATED,
            violations: [],
            warnings: [],
            checkedAt: "2026-07-20T00:00:00.000Z",
          },
        }),
      ),
    ).toBe(CarbonDataBadgeStateEnum.VIOLATED);
  });
});

/**
 * Info: (20260805 - Luphia) 明細與小計必須自洽(Issue B 的顯示端)。
 * 這一組的存在理由:數據表已改為只列 COMPUTED 項目,而 ledger.scopeSubtotals /
 * totalCo2eKg 在匯入之後涵蓋 COMPUTED + IMPORTED。若小計仍讀那兩個欄位,
 * 同一張表會出現「明細加起來 ≠ 小計」—— 查核者會先懷疑每一個數字,
 * 而不是懷疑這是個顯示 bug。
 */
describe("buildCarbonDataTable — detail rows and subtotals must agree", () => {
  const importedEntry = {
    activityKey: "imported:LOCATION:(1) 總公司:1.1",
    scopeCategory: GhgProtocolCategory.SCOPE_1_DIRECT,
    sourceName: "1.1 固定式燃燒",
    quantityRaw: "—",
    convertedQuantity: "2591861.5",
    convertedUnit: "KG",
    co2eKg: "2591861.5",
    provenance: LedgerProvenanceEnum.IMPORTED,
    factor: {
      factorId: "imported",
      name: "不適用(原文照錄)",
      value: "—",
      unit: "—",
      source: "表3.8",
    },
  };

  // Info: (20260805 - Luphia) 混合帳本:1 筆憑證算出的 + 1 筆原文照錄的,ledger 層聚合值含兩者
  const mixedLedger = (): IComputedLedger =>
    buildLedger({
      entries: [...buildLedger().entries, importedEntry],
      scopeSubtotals: {
        [GhgProtocolCategory.SCOPE_2_INDIRECT]: "1235000",
        [GhgProtocolCategory.SCOPE_1_DIRECT]: "2591861.5",
      },
      totalCo2eKg: "3826861.5",
    });

  it("should total only the rows it actually lists", () => {
    const table = buildCarbonDataTable(mixedLedger());
    // Info: (20260805 - Luphia) 明細只有憑證那一筆,故總計必須是 1,235,000 而非混合後的 3,826,861.5
    expect(table).toContain("1,235,000");
    expect(table).not.toContain("3,826,861.5");
    expect(table).not.toContain("2,591,861.5");
  });

  it("should not emit a subtotal row for a scope that has no listed detail row", () => {
    const table = buildCarbonDataTable(mixedLedger());
    /**
     * Info: (20260805 - Luphia) 匯入項目是範疇一,明細裡沒有任何範疇一的列。
     * 小計卻列出範疇一,等於宣稱有一筆本系統算出來的範疇一排放 —— 那是捏造。
     */
    const scopeOneRows = table
      .split("\n")
      .filter((line) => line.includes(GhgProtocolCategory.SCOPE_1_DIRECT));
    expect(scopeOneRows).toHaveLength(0);
  });

  it("should stay self-consistent for a computed-only ledger (no behaviour change)", () => {
    // Info: (20260805 - Luphia) 沒有匯入項時輸出必須與改動前完全相同(既有憑證路徑零影響)
    expect(buildCarbonDataTable(buildLedger())).toBe(
      buildCarbonDataTable(buildLedger()),
    );
    expect(buildCarbonDataTable(buildLedger())).toContain("1,235,000");
  });
});

describe("deriveDataBadgeState — imported-only ledger", () => {
  it("should not claim RECONCILED when every entry is transcribed", () => {
    const importedOnly = buildLedger({
      entries: [
        {
          ...buildLedger().entries[0],
          activityKey: "imported:LOCATION:(1) 總公司:1.1",
          provenance: LedgerProvenanceEnum.IMPORTED,
        },
      ],
    });
    /**
     * Info: (20260805 - Luphia) teal 的語意是「這些數字由本系統的決定論引擎產出」。
     * 只有原文照錄時不成立,而數據表這時也寫「資料不足」—— 徽章與表格必須說同一件事。
     */
    expect(deriveDataBadgeState(importedOnly)).toBe(
      CarbonDataBadgeStateEnum.INSUFFICIENT,
    );
  });
});
