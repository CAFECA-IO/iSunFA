// Info: (20260801 - Tzuhan) 原文表格通道(issue_drafts/inventory_table_import Issue A)
// Info: (20260801 - Tzuhan) 這組測試的核心是一件反直覺的事:數據段落原本會**主動刪掉**表格,
// Info: (20260801 - Tzuhan) 而那是刻意的 zero fabrication 執行面(假設「表格 = LLM 產生 = 不可信」)。
// Info: (20260801 - Tzuhan) 要匯入原文表格就必須讓系統分辨「照抄」與「產生」——依據是錨點而非內容。

import { describe, it, expect } from "@jest/globals";
import {
  buildSourceTableBlock,
  hasSourceTableBlock,
  insertSourceTableBlock,
  SourceTableRejectReasonEnum,
  validateSourceTables,
  type ICarbonSourceTable,
} from "@/lib/carbon_source_table.builder";
import {
  buildCarbonDataTable,
  injectDataTable,
  stripLlmTables,
} from "@/lib/carbon_report_table.builder";
import { CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH } from "@/constants/carbon_source_tables";

// Info: (20260801 - Tzuhan) 取自高興昌盤查報告表3.6(全公司各類別排放量,所在地基準)
const TABLE_3_6: ICarbonSourceTable = {
  tableNo: "表3.6",
  caption: "全公司溫室氣體各類別排放量統計表 (所在地基準)",
  sourcePages: [41],
  markdown: [
    "| 項目 | 類別一 | 類別二 | 類別三 | 類別四 | 總排放量 |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    "| 排放當量(公噸 CO2e/年) | 2833.4400 | 3470.3354 | 1243.1546 | 785.6511 | 8332.581 |",
    "| 氣體別占比(%) | 34.00% | 41.65% | 14.92% | 9.43% | 100.00% |",
  ].join("\n"),
};

const TABLE_3_8: ICarbonSourceTable = {
  tableNo: "表3.8",
  caption: "各公司溫室氣體各類別排放量統計表",
  sourcePages: [41, 43],
  markdown: [
    "| 報告邊界類型 | 溫室氣體排放量 |",
    "| --- | ---: |",
    "| 1.1 固定式燃燒 | 0.4375 |",
    "| 3.1 上游運輸 | NS |",
    "| 4.2 資本財 | NA |",
  ].join("\n"),
};

describe("validateSourceTables", () => {
  it("合法的原文表格通過", () => {
    expect(validateSourceTables([TABLE_3_6, TABLE_3_8]).isValid).toBe(true);
  });

  it("表號格式不符即拒絕(表號會成為錨點的一部分)", () => {
    const result = validateSourceTables([
      { ...TABLE_3_6, tableNo: "Table 3.6" },
    ]);
    expect(result.reason).toBe(SourceTableRejectReasonEnum.INVALID_TABLE_NO);
    expect(result.offendingTableNo).toBe("Table 3.6");
  });

  it("不是表格形狀的內容拒絕(缺分隔列)", () => {
    const result = validateSourceTables([
      { ...TABLE_3_6, markdown: "| 只有表頭 |" },
    ]);
    expect(result.reason).toBe(SourceTableRejectReasonEnum.NOT_A_TABLE);
  });

  it("空內容拒絕", () => {
    const result = validateSourceTables([{ ...TABLE_3_6, markdown: "   " }]);
    expect(result.reason).toBe(SourceTableRejectReasonEnum.EMPTY_MARKDOWN);
  });

  it("超過單段上限即整批拒絕", () => {
    const many = Array.from(
      { length: CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH + 1 },
      (_, i) => ({ ...TABLE_3_6, tableNo: `表3.${i + 1}` }),
    );
    expect(validateSourceTables(many).reason).toBe(
      SourceTableRejectReasonEnum.TOO_MANY_TABLES,
    );
  });
});

describe("buildSourceTableBlock", () => {
  it("標題帶「原文照錄」與頁碼(讀者要能分辨來源並翻回原文對照)", () => {
    const block = buildSourceTableBlock(TABLE_3_6);
    expect(block).toContain("表3.6");
    expect(block).toContain("原文照錄");
    expect(block).toContain("p.41");
  });

  it("跨頁表格標出起訖頁", () => {
    expect(buildSourceTableBlock(TABLE_3_8)).toContain("p.41–43");
  });

  it("儲存格內容逐字保留,不重排也不改寫", () => {
    const block = buildSourceTableBlock(TABLE_3_8);
    expect(block).toContain("| 3.1 上游運輸 | NS |");
    expect(block).toContain("| 4.2 資本財 | NA |");
  });

  it("錨點以表號為鍵,同節多張表可各自定位", () => {
    const block = buildSourceTableBlock(TABLE_3_6);
    expect(block).toContain("carbon-source-table:表3.6:start");
    expect(block).toContain("carbon-source-table:表3.6:end");
  });
});

describe("insertSourceTableBlock", () => {
  it("首次插入附加於敘述尾端,敘述零改動", () => {
    const content = "本節說明全公司排放總量。";
    const next = insertSourceTableBlock(content, TABLE_3_6);
    expect(next.startsWith(content)).toBe(true);
    expect(hasSourceTableBlock(next, "表3.6")).toBe(true);
  });

  it("同表號再次插入為原地替換,不疊加", () => {
    const once = insertSourceTableBlock("敘述", TABLE_3_6);
    const twice = insertSourceTableBlock(once, TABLE_3_6);
    expect(twice.split("carbon-source-table:表3.6:start").length - 1).toBe(1);
  });

  it("不同表號各自成塊,互不覆蓋", () => {
    const both = insertSourceTableBlock(
      insertSourceTableBlock("敘述", TABLE_3_6),
      TABLE_3_8,
    );
    expect(hasSourceTableBlock(both, "表3.6")).toBe(true);
    expect(hasSourceTableBlock(both, "表3.8")).toBe(true);
  });
});

/**
 * Info: (20260801 - Tzuhan) 這一組是 Issue A 的關鍵:原本的剝除會把原文表格一起刪掉。
 * 「現行系統會主動刪掉使用者要求匯入的那些表格」正是計畫裡指出的正面衝突。
 */
describe("stripLlmTables 與原文表格共存", () => {
  it("原文表格不被剝除(錨點內即為照錄內容)", () => {
    const content = insertSourceTableBlock("敘述文字", TABLE_3_6);
    const stripped = stripLlmTables(content);
    expect(stripped).toContain("| 排放當量(公噸 CO2e/年) | 2833.4400");
    expect(stripped).toContain("敘述文字");
  });

  it("模型自行夾帶的表格仍然被剝除(未標記來源者不可信)", () => {
    const content = [
      "敘述文字",
      "",
      "| 我猜的排放量 | 值 |",
      "| --- | ---: |",
      "| 類別一 | 9999 |",
    ].join("\n");
    const stripped = stripLlmTables(content);
    expect(stripped).not.toContain("9999");
    expect(stripped).toContain("敘述文字");
  });

  it("同一段落內:原文表格保留、模型表格剝除", () => {
    const withSource = insertSourceTableBlock("敘述", TABLE_3_6);
    const mixed = [
      withSource,
      "",
      "| 模型自產 | 值 |",
      "| --- | ---: |",
      "| 亂數 | 1234 |",
    ].join("\n");
    const stripped = stripLlmTables(mixed);
    expect(stripped).toContain("8332.581");
    expect(stripped).not.toContain("1234");
  });

  it("原文表格與系統計算表格並存,重算只換系統那一塊", () => {
    const withSource = insertSourceTableBlock("敘述", TABLE_3_6);
    const withBoth = injectDataTable(
      withSource,
      buildCarbonDataTable(undefined),
    );
    const recomputed = injectDataTable(
      withBoth,
      buildCarbonDataTable(undefined),
    );
    // Info: (20260801 - Tzuhan) 原文表格不隨重算變動 —— 原文是既成事實,引擎重算幾次都不該改它
    expect(hasSourceTableBlock(recomputed, "表3.6")).toBe(true);
    expect(recomputed).toContain("8332.581");
    expect(recomputed.split("carbon-data-table:start").length - 1).toBe(1);
  });

  it("程式碼區塊內的表格仍照舊保留(fence-aware 行為不變)", () => {
    const content = [
      "敘述",
      "",
      "```",
      "| a | b |",
      "| --- | --- |",
      "```",
    ].join("\n");
    expect(stripLlmTables(content)).toContain("| a | b |");
  });
});

/**
 * Info: (20260804 - Tzuhan) 表頭列不在第一行的表格必須收下(20260804 放寬)。
 *
 * 原檢查要求分隔列剛好是第二個非空行,等於假設模型照錄時第一行一定是表頭。
 * 實測不成立:表3.8 與表3.4 都被判 not_a_table 整張丟掉,
 * 而表3.8 是桑基圖唯一的資料來源 —— 圖整張消失,報告裡卻只是少一張。
 */
describe("表頭列不在第一行", () => {
  const withHead = (head: string): ICarbonSourceTable => ({
    tableNo: "表3.8",
    caption: "各公司溫室氣體各類別排放量統計表",
    sourcePages: [42, 44],
    markdown: `${head}| 報告邊界 | 排放量 |\n| --- | --- |\n| 1.1 固定式燃燒 | 0.4375 |`,
  });

  it("開頭多一行原文標題仍是表格", () => {
    const result = validateSourceTables([
      withHead("表3.8 各公司溫室氣體各類別排放量統計表\n"),
    ]);
    expect(result.isValid).toBe(true);
  });

  it("開頭多一行廠址標籤仍是表格", () => {
    const result = validateSourceTables([withHead("(1) 總公司\n")]);
    expect(result.isValid).toBe(true);
  });

  it("開頭有空行仍是表格", () => {
    const result = validateSourceTables([withHead("\n\n")]);
    expect(result.isValid).toBe(true);
  });

  /**
   * Info: (20260804 - Tzuhan) 放寬不等於放行散文:分隔列的形狀很特定,
   * 沒有「表頭列 + 緊接分隔列」這一組就仍然不算表格。
   */
  it("沒有分隔列的純文字仍然不是表格", () => {
    const result = validateSourceTables([
      {
        tableNo: "表3.8",
        caption: "x",
        sourcePages: [42],
        markdown:
          "本節說明各公司排放量。\n| 這行有管線符號但下一行不是分隔列 |\n又一段文字。",
      },
    ]);
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe(SourceTableRejectReasonEnum.NOT_A_TABLE);
  });
});
