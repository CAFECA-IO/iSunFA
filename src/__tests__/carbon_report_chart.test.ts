// Info: (20260720 - Tzuhan) #51 圖表模板測試:決定性輸出、數值保真、插入/替換不疊加、凍結與佔位、重算重建

import { describe, it, expect } from "@jest/globals";
import {
  buildCarbonChartBlock,
  insertCarbonChartBlock,
  hasCarbonChartBlocks,
  refreshCarbonChartBlocks,
  collapsePassThroughNodes,
  CARBON_CHART_DEFAULT_LABELS,
} from "@/lib/carbon_report_chart.builder";
import {
  CarbonChartTemplateEnum,
  buildChartAnchorStart,
  CARBON_SANKEY_MAX_MONTH_NODES,
} from "@/constants/carbon_report_charts";
import { ArticulationStatusEnum } from "@/constants/carbon_articulation";
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
    [GhgProtocolCategory.SCOPE_1_DIRECT]: "5000",
    [GhgProtocolCategory.SCOPE_2_INDIRECT]: "1235000",
  },
  totalCo2eKg: "1240000",
  computedAt: "2026-07-20T00:00:00.000Z",
  ...overrides,
});

/**
 * Info: (20260828 - Emily) 部分入帳時圖照畫,但要說出「這不是全貌」
 * (PR #6725 round-2 低-1 的第二半)。
 *
 * 實際情境:一份報告兩個段落各自產生分錄,一個勾稽通過、一個被擋 ——
 * 走的是 apply 分支(帳本非空),於是圖照畫、數字照印,
 * 而被擋那半在紙上完全不存在。讀者看到一張自我一致的桑基圖,
 * 無從得知總量少了一塊 —— 「半套資料入帳會讓每張圖都錯得很像對的」。
 */
describe("有阻擋紀錄時的圖旁附註(round-2 低-1 第二半)", () => {
  const blocks = [
    { reason: "表3.8 有 6 列無法解析(差額 12,345 kgCO2e)" },
  ] as const;

  it("帳本非空時是**附註**,不是取代:圖仍然在,附註也在", () => {
    const block = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger(),
      CARBON_CHART_DEFAULT_LABELS,
      undefined,
      blocks,
    );
    expect(block).toContain("```mermaid");
    expect(block).toContain('"SCOPE_2_INDIRECT" : 1235000');
    expect(block).toContain("不是全公司全貌");
    expect(block).toContain("表3.8 有 6 列無法解析");
  });

  it("附註排在圖之後(先給圖,再說它缺了什麼)", () => {
    const block = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger(),
      CARBON_CHART_DEFAULT_LABELS,
      undefined,
      blocks,
    );
    expect(block.indexOf("```mermaid")).toBeLessThan(
      block.indexOf("不是全公司全貌"),
    );
  });

  it("明細表與桑基圖同樣附註(不是只有一種模板)", () => {
    const table = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SOURCE_TABLE,
      buildLedger(),
      CARBON_CHART_DEFAULT_LABELS,
      undefined,
      blocks,
    );
    expect(table).toContain("| 外購電力 |");
    expect(table).toContain("不是全公司全貌");
  });

  it("沒有阻擋紀錄時一個字都不多(逐字與原本相同)", () => {
    const plain = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger(),
    );
    const withEmpty = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger(),
      CARBON_CHART_DEFAULT_LABELS,
      undefined,
      [],
    );
    expect(withEmpty).toBe(plain);
    expect(plain).not.toContain("不是全公司全貌");
  });
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
        entries: [
          voucherEntry("aaaa1111", "1000"),
          voucherEntry("bbbb2222", "235"),
        ],
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

/**
 * Info: (20260806 - Tzuhan) 月別層(帳本的 tradingDate 打通後才成立)。
 * 這一層的資料一路要經過 esg_link → 計算服務 → 本模組,漏任何一段的表現都是
 * 「有些筆沒有月份」—— 看起來像資料缺日期,不像程式漏了一行。故守恆與缺值都要有測試。
 */
describe("EMISSION_SANKEY 月別層", () => {
  const MILLISECONDS_PER_SECOND = 1000;
  const secondsOf = (iso: string): number =>
    Math.floor(new Date(iso).getTime() / MILLISECONDS_PER_SECOND);

  const dated = (
    iso: string | undefined,
    co2e: string,
    sourceName = "外購電力",
  ): IComputedLedger["entries"][number] => ({
    ...buildLedger().entries[0],
    activityKey: `k-${iso ?? "none"}-${sourceName}-${co2e}`,
    sourceName,
    co2eKg: co2e,
    tradingTimestamp: iso ? secondsOf(iso) : undefined,
  });

  const sankeyOf = (entries: IComputedLedger["entries"]): string =>
    buildCarbonChartBlock(
      CarbonChartTemplateEnum.EMISSION_SANKEY,
      buildLedger({ entries }),
    );

  it("有日期即在最前面加一層月別(YYYY-MM)", () => {
    const block = sankeyOf([
      dated("2025-01-10T00:00:00Z", "100"),
      dated("2025-02-10T00:00:00Z", "250"),
    ]);
    expect(block).toContain('"2025-01","外購電力",100');
    expect(block).toContain('"2025-02","外購電力",250');
    // Info: (20260806 - Tzuhan) 月別層是加在原有結構前面,不是取代它
    expect(block).toContain('"外購電力","SCOPE_2_INDIRECT",350');
  });

  /**
   * Info: (20260806 - Tzuhan) 一筆日期都沒有時不加這一層:
   * 對話申報與匯入報告都沒有逐筆日期,那時月別層只是一個「未標註期間」的漏斗節點 —— 純噪音。
   */
  it("一筆日期都沒有就不加月別層(行為與先前完全相同)", () => {
    const block = sankeyOf([dated(undefined, "100")]);
    expect(block).not.toContain("未標註期間");
    expect(block).toContain('"外購電力","SCOPE_2_INDIRECT",100');
  });

  /**
   * Info: (20260806 - Tzuhan) 有無日期混在一起是最需要說清楚的情形:
   * 併進某個月份是編造;整批丟掉會讓總流入不等於總流出,而這張圖的意義正是守恆的視覺化。
   */
  it("有日期與沒日期混在一起時,沒日期的走「未標註期間」而非被丟掉", () => {
    const block = sankeyOf([
      dated("2025-01-10T00:00:00Z", "100"),
      dated(undefined, "40"),
    ]);
    expect(block).toContain('"2025-01","外購電力",100');
    expect(block).toContain('"未標註期間","外購電力",40');

    // Info: (20260806 - Tzuhan) 月別層的總流出必須等於排放源層的總流入(守恆)
    const rows = block
      .split("\n")
      .filter((line) => line.startsWith('"') && line.split(",").length === 3);
    const monthOut = rows
      .filter((row) => /^"(\d{4}-\d{2}|未標註期間)"/.test(row))
      .reduce((sum, row) => sum + Number(row.split(",")[2]), 0);
    expect(monthOut).toBe(140);
  });

  it("同月同源只畫一條線(逐鍵累加,不畫兩條平行線)", () => {
    const block = sankeyOf([
      dated("2025-01-10T00:00:00Z", "100"),
      dated("2025-01-20T00:00:00Z", "60"),
    ]);
    const januaryRows = block
      .split("\n")
      .filter((line) => line.startsWith('"2025-01"'));
    expect(januaryRows).toEqual(['"2025-01","外購電力",160']);
  });

  /**
   * Info: (20260806 - Tzuhan) 跨度過大即整層略過,**並且說出來**。
   * 少一層而不講,讀者會以為這份帳本根本沒有日期。
   */
  it("月別數超過上限即略過該層並明說", () => {
    const entries = Array.from(
      { length: CARBON_SANKEY_MAX_MONTH_NODES + 1 },
      (_, index) => {
        const year = 2020 + Math.floor(index / 12);
        const month = String((index % 12) + 1).padStart(2, "0");
        return dated(`${year}-${month}-05T00:00:00Z`, "10");
      },
    );
    const block = sankeyOf(entries);
    expect(block).not.toContain('"2020-01"');
    expect(block).toContain("略過月別層");
    expect(block).toContain('"外購電力","SCOPE_2_INDIRECT"');
  });

  it("上限之內的跨年度仍畫月別層", () => {
    const entries = Array.from(
      { length: CARBON_SANKEY_MAX_MONTH_NODES },
      (_, index) => {
        const year = 2020 + Math.floor(index / 12);
        const month = String((index % 12) + 1).padStart(2, "0");
        return dated(`${year}-${month}-05T00:00:00Z`, "10");
      },
    );
    const block = sankeyOf(entries);
    expect(block).toContain('"2020-01","外購電力",10');
    expect(block).not.toContain("略過月別層");
  });

  it("有憑證層時月別接到憑證節點,不跳過憑證", () => {
    const withVoucher: IComputedLedger["entries"][number] = {
      ...dated("2025-01-10T00:00:00Z", "100"),
      evidence: { esgRecordId: "esg-1", voucherId: "voucher-aaaa1111" },
    };
    const block = sankeyOf([withVoucher]);
    expect(block).toContain('"2025-01","外購電力 #aaaa1111",100');
    expect(block).toContain('"外購電力 #aaaa1111","外購電力",100');
  });
});

/**
 * Info: (20260806 - Tzuhan) 摺疊純傳遞節點。
 *
 * 一入一出且進出同值的節點在數學上什麼都沒說,而它在畫面上要付兩份代價:
 * 佔一欄寬度,而 mermaid 把標籤畫在節點右側 → 標籤壓到下一層去。
 * 實測那份報告的「(1) 範疇二 3464.5」就直接疊在「(1) 類別二 3464.5」上。
 */
describe("collapsePassThroughNodes", () => {
  const edge = (from: string, to: string, co2eKg: string) => ({
    from,
    to,
    co2eKg,
  });

  it("一入一出且同值即摺掉", () => {
    const result = collapsePassThroughNodes(
      [edge("A", "N", "100"), edge("N", "B", "100")],
      new Set(["A"]),
    );
    expect(result).toEqual([edge("A", "B", "100")]);
  });

  it("連續的傳遞鏈一路摺完", () => {
    const result = collapsePassThroughNodes(
      [edge("A", "N1", "100"), edge("N1", "N2", "100"), edge("N2", "B", "100")],
      new Set(["A"]),
    );
    expect(result).toEqual([edge("A", "B", "100")]);
  });

  // Info: (20260806 - Tzuhan) 真的分岔的節點帶了資訊,不可摺
  it("分岔的節點保留", () => {
    const edges = [
      edge("A", "N", "100"),
      edge("N", "B", "60"),
      edge("N", "C", "40"),
    ];
    expect(collapsePassThroughNodes(edges, new Set(["A"]))).toEqual(edges);
  });

  /**
   * Info: (20260806 - Tzuhan) 進出不同值代表它吃掉或生出了流量 —— 那是實質資訊(門檻濾掉的差額),
   * 摺掉會把「這裡少了一些」變成看不見。
   */
  it("進出不同值即不摺(差額是實質資訊)", () => {
    const edges = [edge("A", "N", "100"), edge("N", "B", "90")];
    expect(collapsePassThroughNodes(edges, new Set(["A"]))).toEqual(edges);
  });

  /**
   * Info: (20260806 - Tzuhan) 受保護的節點即使符合條件也不摺 ——
   * 廠址是報告明載的組織邊界,不因數值重複而從查核圖上消失。
   */
  it("受保護的節點不摺(廠址是組織邊界)", () => {
    const edges = [edge("全公司", "#1 廠", "100"), edge("#1 廠", "1.1", "100")];
    expect(
      collapsePassThroughNodes(edges, new Set(["全公司", "#1 廠"])),
    ).toEqual(edges);
  });

  // Info: (20260806 - Tzuhan) 摺疊不得改變總流入/總流出
  it("摺疊前後總流量不變", () => {
    const edges = [
      edge("A", "N", "100"),
      edge("N", "B", "100"),
      edge("A", "M", "50"),
      edge("M", "C", "30"),
      edge("M", "D", "20"),
    ];
    const sum = (list: readonly { co2eKg: string }[]): number =>
      list.reduce((total, e) => total + Number(e.co2eKg), 0);
    const result = collapsePassThroughNodes(edges, new Set(["A"]));
    const rootOut = (
      list: readonly { from: string; co2eKg: string }[],
    ): number => sum(list.filter((e) => e.from === "A"));
    expect(rootOut(result)).toBe(rootOut(edges));
    expect(sum(result)).toBeLessThan(sum(edges));
  });

  it("同輸入同輸出(決定性)", () => {
    const edges = [edge("A", "N", "100"), edge("N", "B", "100")];
    expect(collapsePassThroughNodes(edges, new Set(["A"]))).toEqual(
      collapsePassThroughNodes(edges, new Set(["A"])),
    );
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

  /**
   * Info: (20260807 - Emily) 「刷新後桑基圖不見」的回歸測試
   * (issue_drafts/inventory_table_import/12)。
   *
   * UAT 提供的刷新前後 markdown 比對顯示:錨點完好,中間的 sankey 被換成
   * 「(資料不足...)」佔位字串。成因是重載時帳本還沒載入完就重建了一次,
   * 而那次重建的結果被存了回去 —— 一次沉默的降級變成永久的資料損失。
   */
  it("should not overwrite a rendered chart when the rebuild has no data", () => {
    const chart = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger(),
    );
    const content = insertCarbonChartBlock(
      "敘述。",
      CarbonChartTemplateEnum.SCOPE_PIE,
      chart,
    );
    expect(content).toContain("```mermaid");

    // Info: (20260807 - Emily) 帳本還沒載入 —— 這正是重載當下的狀態
    const refreshed = refreshCarbonChartBlocks(content, undefined);
    expect(refreshed).toBe(content);
  });

  it("should still fill an empty block when the rebuild has data", () => {
    /**
     * Info: (20260807 - Emily) 保護不能變成「一旦空過就永遠填不回去」——
     * 佔位字串被真正的圖表取代仍然必須發生,否則第一次重建失敗就再也救不回來。
     */
    const placeholder = insertCarbonChartBlock(
      "敘述。",
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildCarbonChartBlock(CarbonChartTemplateEnum.SCOPE_PIE, undefined),
    );
    expect(placeholder).not.toContain("```mermaid");

    const refreshed = refreshCarbonChartBlocks(placeholder, buildLedger());
    expect(refreshed).toContain("```mermaid");
  });

  /**
   * Info: (20260808 - Luphia) 守恆凍結必須穿透「保留現有」的防護。
   *
   * 凍結告警是 blockquote —— 無 mermaid 也無表格列,`carriesRenderedData`
   * 會把它判成降級。若防護不放行,勾稽違反時舊圖永遠留在畫面上,
   * 凍結機制(#22)對「已經畫出圖」的報告形同不存在;
   * 而同一次重算裡資料表格是無條件替換的 —— 表格凍結、圖表照舊,同頁自相矛盾。
   */
  it("should let a conservation freeze replace an existing chart", () => {
    const chart = buildCarbonChartBlock(
      CarbonChartTemplateEnum.SCOPE_PIE,
      buildLedger(),
    );
    const content = insertCarbonChartBlock(
      "敘述。",
      CarbonChartTemplateEnum.SCOPE_PIE,
      chart,
    );
    expect(content).toContain("```mermaid");

    const violated = buildLedger({
      articulation: {
        status: ArticulationStatusEnum.VIOLATED,
        violations: [],
        warnings: [],
        checkedAt: "2026-08-08T00:00:00.000Z",
      },
    });
    const refreshed = refreshCarbonChartBlocks(content, violated);
    expect(refreshed).not.toContain("```mermaid");
    expect(refreshed).toContain("凍結");
  });
});

/**
 * Info: (20260819 - Emily) `open/53`:圖上標範疇制、敘述用類別制,而紙上沒有一句話說
 * 它們是同一批排放源。真修要改分組鍵(多個 GHG 類別對到同一個 ISO 類別),
 * 08-19 先把對照說出來 —— 隱藏的分類判斷等於沒有依據。
 *
 * 兩條測試都是必要的,而且第二條才是重點:
 * 加說明的那次改動**不可以**讓桑基圖本身消失。這一週已經有過
 * 「修一件事、另一件安靜地不見」的先例(圖表超上限整張不畫),
 * 所以判準要同時釘住「說明在」與「圖還在」。
 */
describe("IMPORTED_EMISSION_SANKEY 的範疇↔類別對照（open/53）", () => {
  const importedLedger = () =>
    buildLedger({
      entries: [
        {
          ...buildLedger().entries[0],
          provenance: LedgerProvenanceEnum.IMPORTED,
        },
      ],
    });

  it("圖下方有範疇↔類別的對照說明", () => {
    const block = buildCarbonChartBlock(
      CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY,
      importedLedger(),
    );

    expect(CARBON_CHART_DEFAULT_LABELS.importedSankeyIsoMapping).toBeDefined();
    expect(block).toContain(
      CARBON_CHART_DEFAULT_LABELS.importedSankeyIsoMapping as string,
    );
  });

  it("加了說明之後桑基圖本身還在", () => {
    const block = buildCarbonChartBlock(
      CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY,
      importedLedger(),
    );

    expect(block).toContain("sankey-beta");
    expect(block).toContain("```mermaid");
    // Info: (20260819 - Emily) 說明是圖**之後**的一行,不是取代圖
    expect(block.indexOf("sankey-beta")).toBeLessThan(
      block.indexOf(
        CARBON_CHART_DEFAULT_LABELS.importedSankeyIsoMapping as string,
      ),
    );
  });
});
