// Info: (20260801 - Tzuhan) 段落組裝與原文表格 Schema(issue_drafts/inventory_table_import Issue A 第 2、4 點)
// Info: (20260801 - Tzuhan) 核心約束是冪等:重算會反覆呼叫組裝器,每次都必須先剝除受管區塊再重組,
// Info: (20260801 - Tzuhan) 否則區塊逐次疊加 —— 那會讓同一段裡出現三張一樣的表,而讀者無從判斷哪張是最新的。

import { describe, it, expect } from "@jest/globals";
import {
  CARBON_RECONCILIATION_END,
  CARBON_RECONCILIATION_START,
  composeParagraphContent,
  extractNarrative,
} from "@/lib/carbon_paragraph_composer";
import {
  buildCarbonDataTable,
  CARBON_DATA_TABLE_START,
  stripLlmTables,
} from "@/lib/carbon_report_table.builder";
import {
  hasSourceTableBlock,
  type ICarbonSourceTable,
} from "@/lib/carbon_source_table.builder";
import {
  CarbonSourceTableListSchema,
  CarbonSourceTableSchema,
} from "@/validators";
import { CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH } from "@/constants/carbon_source_tables";

const TABLE_3_6: ICarbonSourceTable = {
  tableNo: "表3.6",
  caption: "全公司溫室氣體各類別排放量統計表 (所在地基準)",
  sourcePages: [41],
  markdown: [
    "| 項目 | 類別一 | 總排放量 |",
    "| --- | ---: | ---: |",
    "| 排放當量(公噸 CO2e/年) | 2833.4400 | 8332.581 |",
  ].join("\n"),
};

const TABLE_3_7: ICarbonSourceTable = {
  ...TABLE_3_6,
  tableNo: "表3.7",
  caption: "全公司溫室氣體各類別排放量統計表 (市場基準)",
};

const NARRATIVE = "本節說明全公司溫室氣體排放總量的彙總方式。";

describe("composeParagraphContent 的固定順序", () => {
  it("依「敘述 → 原文表格 → 系統表格 → 對帳」排列", () => {
    const result = composeParagraphContent({
      content: NARRATIVE,
      sourceTables: [TABLE_3_6],
      dataTableBlock: buildCarbonDataTable(undefined),
      reconciliation: "原文總量 8,332.581 公噸;系統計算尚無資料。",
    });
    const posNarrative = result.indexOf(NARRATIVE);
    const posSource = result.indexOf("carbon-source-table:表3.6:start");
    const posData = result.indexOf(CARBON_DATA_TABLE_START);
    const posRecon = result.indexOf(CARBON_RECONCILIATION_START);
    expect(posNarrative).toBeGreaterThanOrEqual(0);
    expect(posSource).toBeGreaterThan(posNarrative);
    expect(posData).toBeGreaterThan(posSource);
    expect(posRecon).toBeGreaterThan(posData);
  });

  it("多張原文表格依給定順序輸出", () => {
    const result = composeParagraphContent({
      content: NARRATIVE,
      sourceTables: [TABLE_3_6, TABLE_3_7],
    });
    expect(result.indexOf("表3.7")).toBeGreaterThan(result.indexOf("表3.6"));
  });

  it("缺任一種區塊時其餘照常輸出,不留空殼", () => {
    const onlyNarrative = composeParagraphContent({ content: NARRATIVE });
    expect(onlyNarrative).toBe(NARRATIVE);
    expect(onlyNarrative).not.toContain("carbon-");

    const noNarrative = composeParagraphContent({
      content: "",
      sourceTables: [TABLE_3_6],
    });
    expect(noNarrative.startsWith("<!-- carbon-source-table")).toBe(true);
  });

  it("空白的對帳文字不產生對帳區塊", () => {
    const result = composeParagraphContent({
      content: NARRATIVE,
      reconciliation: "   ",
    });
    expect(result).not.toContain(CARBON_RECONCILIATION_START);
  });
});

describe("composeParagraphContent 的冪等性", () => {
  it("重複組裝結果不變(區塊不疊加)", () => {
    const input = {
      content: NARRATIVE,
      sourceTables: [TABLE_3_6],
      dataTableBlock: buildCarbonDataTable(undefined),
      reconciliation: "對帳說明",
    };
    const once = composeParagraphContent(input);
    const twice = composeParagraphContent({ ...input, content: once });
    const thrice = composeParagraphContent({ ...input, content: twice });
    expect(twice).toBe(once);
    expect(thrice).toBe(once);
    expect(once.split("carbon-source-table:表3.6:start").length - 1).toBe(1);
  });

  it("重算時原文表格可被移除(來源不再提供該表)", () => {
    const withTable = composeParagraphContent({
      content: NARRATIVE,
      sourceTables: [TABLE_3_6],
    });
    const without = composeParagraphContent({ content: withTable });
    expect(hasSourceTableBlock(without, "表3.6")).toBe(false);
    expect(without).toBe(NARRATIVE);
  });

  it("敘述文字零改動(只搬位置不改寫)", () => {
    const messy = `${NARRATIVE}\n\n第二段敘述保留換行。`;
    const result = composeParagraphContent({
      content: messy,
      sourceTables: [TABLE_3_6],
    });
    expect(result.startsWith(messy)).toBe(true);
  });
});

describe("extractNarrative", () => {
  it("剝除三種受管區塊後只剩敘述", () => {
    const composed = composeParagraphContent({
      content: NARRATIVE,
      sourceTables: [TABLE_3_6, TABLE_3_7],
      dataTableBlock: buildCarbonDataTable(undefined),
      reconciliation: "對帳說明",
    });
    expect(extractNarrative(composed)).toBe(NARRATIVE);
  });

  it("孤兒結束錨點不留在敘述裡(內容曾被截斷)", () => {
    const broken = `${NARRATIVE}\n${CARBON_RECONCILIATION_END}`;
    expect(extractNarrative(broken)).toBe(NARRATIVE);
  });
});

/**
 * Info: (20260801 - Tzuhan) 組裝後的內容仍要能通過既有的剝除守門:
 * 那道守門是數據段落的 zero fabrication 執行面,不能因為新增組裝器就繞過它。
 */
describe("與 stripLlmTables 的相容性", () => {
  it("組裝結果經剝除後,原文表格仍在、敘述仍在", () => {
    const composed = composeParagraphContent({
      content: NARRATIVE,
      sourceTables: [TABLE_3_6],
      dataTableBlock: buildCarbonDataTable(undefined),
    });
    const stripped = stripLlmTables(composed);
    expect(stripped).toContain("8332.581");
    expect(stripped).toContain(NARRATIVE);
  });
});

describe("CarbonSourceTableSchema", () => {
  it("接受合法的原文表格", () => {
    expect(CarbonSourceTableSchema.safeParse(TABLE_3_6).success).toBe(true);
  });

  it("表號格式不符即拒絕(它會成為錨點的一部分)", () => {
    [
      "Table 3.6",
      "表3",
      "3.6",
      "<!-- carbon-data-table:start -->",
      "表3.6:start -->",
    ].forEach((tableNo) => {
      expect(
        CarbonSourceTableSchema.safeParse({ ...TABLE_3_6, tableNo }).success,
      ).toBe(false);
    });
  });

  it("頁碼須為正整數且最多兩個(跨頁表格給起訖)", () => {
    expect(
      CarbonSourceTableSchema.safeParse({ ...TABLE_3_6, sourcePages: [41, 43] })
        .success,
    ).toBe(true);
    expect(
      CarbonSourceTableSchema.safeParse({ ...TABLE_3_6, sourcePages: [] })
        .success,
    ).toBe(true);
    [[0], [-1], [1.5], [41, 42, 43], [99999]].forEach((sourcePages) => {
      expect(
        CarbonSourceTableSchema.safeParse({ ...TABLE_3_6, sourcePages })
          .success,
      ).toBe(false);
    });
  });

  it("標題過長即拒絕(模型把整段敘述塞進標題就不是照抄)", () => {
    expect(
      CarbonSourceTableSchema.safeParse({
        ...TABLE_3_6,
        caption: "標".repeat(121),
      }).success,
    ).toBe(false);
  });

  it("空 markdown 拒絕", () => {
    expect(
      CarbonSourceTableSchema.safeParse({ ...TABLE_3_6, markdown: "" }).success,
    ).toBe(false);
  });

  it("清單上限與 builder 共用同一常數", () => {
    const many = Array.from(
      { length: CARBON_SOURCE_TABLE_MAX_PER_PARAGRAPH + 1 },
      () => TABLE_3_6,
    );
    expect(CarbonSourceTableListSchema.safeParse(many).success).toBe(false);
    expect(
      CarbonSourceTableListSchema.safeParse(many.slice(0, -1)).success,
    ).toBe(true);
  });
});
