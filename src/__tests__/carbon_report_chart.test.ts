// Info: (20260720 - Tzuhan) #51 圖表模板測試:決定性輸出、數值保真、插入/替換不疊加、凍結與佔位、重算重建

import { describe, it, expect } from "@jest/globals";
import {
  buildCarbonChartBlock,
  insertCarbonChartBlock,
  hasCarbonChartBlocks,
  refreshCarbonChartBlocks,
} from "@/lib/carbon_report_chart.builder";
import {
  CarbonChartTemplateEnum,
  buildChartAnchorStart,
} from "@/constants/carbon_report_charts";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
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
    [GhgProtocolCategory.SCOPE_1_DIRECT]: "5000",
    [GhgProtocolCategory.SCOPE_2_INDIRECT]: "1235000",
  },
  totalCo2eKg: "1240000",
  computedAt: "2026-07-20T00:00:00.000Z",
  ...overrides,
});

describe("buildCarbonChartBlock", () => {
  it("should render a mermaid pie with engine figures verbatim (deterministic)", () => {
    const block = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger(),
    );
    expect(block).toContain("```mermaid");
    expect(block).toContain("pie title");
    // Info: (20260720 - Tzuhan) mermaid 數值不加千分位(圖表引擎解析),與引擎值精確一致
    expect(block).toContain('"SCOPE_2_INDIRECT" : 1235000');
    expect(block).toContain('"SCOPE_1_DIRECT" : 5000');
    expect(
      buildCarbonChartBlock(CarbonChartTemplateEnum.SCOPE_PIE, buildLedger()),
    ).toBe(block);
  });

  it("should render an xychart bar with scope axis and values", () => {
    const block = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_BAR,
      buildLedger(),
    );
    expect(block).toContain("xychart-beta");
    expect(block).toContain('"SCOPE_1_DIRECT", "SCOPE_2_INDIRECT"');
    expect(block).toContain("bar [5000, 1235000]");
  });

  it("should reuse the #23 table for SOURCE_TABLE without double anchors", () => {
    const block = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SOURCE_TABLE,
      buildLedger(),
    );
    expect(block).toContain("| 外購電力 |");
    expect(block).not.toContain("carbon-data-table");
    expect(block).toContain(
      buildChartAnchorStart(CarbonChartTemplateEnum.SOURCE_TABLE),
    );
  });

  it("should render placeholder on empty ledger and freeze warning on violation", () => {
    const empty = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      undefined,
    );
    expect(empty).toContain("資料不足");
    expect(empty).not.toContain("```mermaid");

    const frozen = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger({
        articulation: {
          status: ArticulationStatusEnum.VIOLATED,
          violations: [],
          warnings: [],
          checkedAt: "2026-07-20T00:00:00.000Z",
        },
      }),
    );
    expect(frozen).toContain("凍結");
    expect(frozen).not.toContain("```mermaid");
  });
});

describe("insertCarbonChartBlock / refreshCarbonChartBlocks", () => {
  it("should append once and replace in place on re-insert (no stacking)", () => {
    const narrative = "本段敘述。";
    const pie = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger(),
    );
    const v1 = insertCarbonChartBlock(
      narrative,
      CarbonChartTemplateEnum.SCOPE_PIE,
      pie,
    );
    expect(hasCarbonChartBlocks(v1)).toBe(true);

    const v2 = insertCarbonChartBlock(
      v1,
      CarbonChartTemplateEnum.SCOPE_PIE,
      pie,
    );
    expect(
      v2.split(buildChartAnchorStart(CarbonChartTemplateEnum.SCOPE_PIE)),
    ).toHaveLength(2);
    expect(v2.startsWith("本段敘述。")).toBe(true);
  });

  it("should rebuild all embedded charts from a new ledger (narrative untouched)", () => {
    const pie = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger(),
    );
    const content = insertCarbonChartBlock(
      "敘述。",
      CarbonChartTemplateEnum.SCOPE_PIE,
      pie,
    );

    const refreshed = refreshCarbonChartBlocks(
      content,
      buildLedger({
        scopeSubtotals: { [GhgProtocolCategory.SCOPE_1_DIRECT]: "777" },
      }),
    );
    expect(refreshed).toContain(": 777");
    expect(refreshed).not.toContain("1235000");
    expect(refreshed.startsWith("敘述。")).toBe(true);
  });
});
