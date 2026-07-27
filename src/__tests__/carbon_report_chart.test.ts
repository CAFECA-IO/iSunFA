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

describe("EMISSION_SANKEY (#53 憑證→排放源→Scope 碳流量)", () => {
  const voucherEntry = (
    id: string,
    co2e: string,
  ): IComputedLedger["entries"][number] => ({
    ...buildLedger().entries[0],
    activityKey: `k-${id}`,
    co2eKg: co2e,
    evidence: { esgRecordId: `esg-${id}`, voucherId: `voucher-${id}` },
  });

  it("should render voucher → source → scope flows with engine values verbatim", () => {
    const block = buildCarbonChartBlock(
      CarbonChartTemplateEnum.EMISSION_SANKEY,
      buildLedger({
        entries: [voucherEntry("aaaa1111", "1000"), voucherEntry("bbbb2222", "235")],
        scopeSubtotals: { [GhgProtocolCategory.SCOPE_2_INDIRECT]: "1235" },
      }),
    );
    expect(block).toContain("sankey-beta");
    // Info: (20260720 - Tzuhan) 憑證層:每張憑證一條流量(節點名含 voucher id 尾碼)
    expect(block).toContain('"外購電力 #aaaa1111","外購電力",1000');
    expect(block).toContain('"外購電力 #bbbb2222","外購電力",235');
    // Info: (20260720 - Tzuhan) 排放源層:同源加總 → Scope(總流入=總流出,守恆視覺化)
    expect(block).toContain('"外購電力","SCOPE_2_INDIRECT",1235');
  });

  it("should aggregate the chat-declared node and drop the voucher layer beyond the node guard", () => {
    // Info: (20260720 - Tzuhan) 無憑證來源 → 聚合為「對話/附件申報」節點?非也:無任何憑證時直接兩層
    const noEvidence = buildCarbonChartBlock(
      CarbonChartTemplateEnum.EMISSION_SANKEY,
      buildLedger(),
    );
    expect(noEvidence).toContain('"外購電力","SCOPE_2_INDIRECT"');
    expect(noEvidence).not.toContain(" #");

    // Info: (20260720 - Tzuhan) 混合來源:對話申報紀錄聚合為單一節點
    const mixed = buildCarbonChartBlock(
      CarbonChartTemplateEnum.EMISSION_SANKEY,
      buildLedger({
        entries: [voucherEntry("cccc3333", "1000"), buildLedger().entries[0]],
      }),
    );
    expect(mixed).toContain('"對話/附件申報"');

    // Info: (20260720 - Tzuhan) >30 憑證 → 略過憑證層(毛線團護欄)
    const many = buildCarbonChartBlock(
      CarbonChartTemplateEnum.EMISSION_SANKEY,
      buildLedger({
        entries: Array.from({ length: 31 }, (_, i) =>
          voucherEntry(`v${i}`, "10"),
        ),
      }),
    );
    expect(many).not.toContain(" #");
    expect(many).toContain('"外購電力","SCOPE_2_INDIRECT"');
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
