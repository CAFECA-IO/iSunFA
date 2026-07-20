// Info: (20260720 - Emily) #23 報告數據表格產生器測試:決定性輸出、LLM 表格丟棄、注入/替換、凍結、徽章三態

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
    // Info: (20260720 - Emily) 數字與 #21 引擎產出精確一致(千分位格式化,無 number 運算)
    expect(table).toContain("1,235,000");
    expect(table).toContain("0.494");
    expect(table).toContain("台灣電力公司 2024");
    expect(table).toContain(CARBON_DATA_TABLE_START);
    expect(table).toContain(CARBON_DATA_TABLE_END);
    // Info: (20260720 - Emily) 同輸入同輸出(決定性)
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
    // Info: (20260720 - Emily) 凍結時不得輸出任何數據表格列
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

    // Info: (20260720 - Emily) 重算後替換錨點區塊:敘述零改動,新數字生效
    const updated = buildCarbonDataTable(
      buildLedger({ totalCo2eKg: "999", scopeSubtotals: { S2: "999" } }),
    );
    const v2 = injectDataTable(v1, updated);
    expect(v2).toContain("999");
    expect(v2).not.toContain("1,235,000");
    expect(v2.startsWith("敘述文字。")).toBe(true);
    // Info: (20260720 - Emily) 錨點只有一組(替換非疊加)
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
