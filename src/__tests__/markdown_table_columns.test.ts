/**
 * Info: (20260811 - Emily) 表頭比資料列窄時 GFM 會靜默丟欄
 * (data/issue_drafts/open/19 第 3 張票的實際根因)。
 *
 * 這裡的樣本取自 UAT 那份報告的表3.1(原文 p.17–19):
 * 原始報告是兩層表頭 —— 「可能產生溫室氣體種類」橫跨七種氣體 ——
 * 模型把父標題那列寫成 4 欄,資料列卻有 10 欄,於是五種氣體與「(類別)」欄
 * 連同內容一起消失。實測整份報告 4 張表共 261 個非空儲存格就這樣不見。
 */
import { describe, it, expect } from "@jest/globals";
import { padTableHeaderToWidest } from "@/lib/utils/markdown_table_columns";

const TABLE_3_1 = [
  "| 設施/活動 | 溫室氣體源 | 可能產生溫室氣體種類 | 備註 |",
  "| :--- | :--- | :--- | :--- |",
  "| | | CO2 | CH4 | N2O | HFCs | PFCs | NF3 | SF6 | （類別） |",
  "| 緊急發電機 | 柴油 | V | V | V | | | | | 類別一 |",
  "| 公務車 | 車用汽油 | V | V | V | | | | | |",
].join("\n");

const cellsOf = (markdown: string): string[][] =>
  markdown
    .split("\n")
    .filter((line) => !/^\s*\|[\s:|-]+\|\s*$/.test(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

describe("padTableHeaderToWidest", () => {
  it("should widen a header that is narrower than its data rows", () => {
    const fix = padTableHeaderToWidest(TABLE_3_1);

    expect(fix.headerColumns).toBe(4);
    expect(fix.widestColumns).toBe(10);
    // Info: (20260811 - Emily) 七種氣體少了五種 + （類別）欄 + 兩列的資料
    expect(fix.recoveredCells).toBeGreaterThan(0);
    cellsOf(fix.markdown).forEach((row) => expect(row).toHaveLength(10));
  });

  it("should not change any existing cell, only append empty ones", () => {
    const before = cellsOf(TABLE_3_1);
    const after = cellsOf(padTableHeaderToWidest(TABLE_3_1).markdown);

    after.forEach((row, index) => {
      const original = before[index];
      expect(row.slice(0, original.length)).toEqual(original);
      expect(row.slice(original.length).every((cell) => cell === "")).toBe(
        true,
      );
    });
  });

  it("should leave a table alone when the extra cells are all empty", () => {
    // Info: (20260811 - Emily) 行尾多打一個 | 只會多出一個空格,補欄反而憑空多一條空欄
    const trailingPipe = [
      "| 項目 | 數值 |",
      "| :--- | :--- |",
      "| 用電 | 123 | |",
    ].join("\n");

    const fix = padTableHeaderToWidest(trailingPipe);

    expect(fix.widestColumns).toBe(3);
    expect(fix.recoveredCells).toBe(0);
    expect(fix.markdown).toBe(trailingPipe);
  });

  it("should leave text that is not a table untouched", () => {
    const prose = "本公司之重大性排放評估準則,依據預期用途逐項討論。";

    const fix = padTableHeaderToWidest(prose);

    expect(fix.markdown).toBe(prose);
    expect(fix.headerColumns).toBe(0);
  });

  it("should keep a well-formed table byte-identical", () => {
    const wellFormed = [
      "| 排放類別 | 排放項目 | 加總 |",
      "| :--- | :--- | :--- |",
      "| 2.1 外購電力 | 外購電力 | 21 |",
    ].join("\n");

    expect(padTableHeaderToWidest(wellFormed).markdown).toBe(wellFormed);
  });

  it("should not be fooled by an escaped pipe inside a cell", () => {
    const escaped = [
      "| 項目 | 說明 |",
      "| :--- | :--- |",
      "| 判定 | 通過 \\| 未通過 | 補充 |",
    ].join("\n");

    const fix = padTableHeaderToWidest(escaped);

    // Info: (20260811 - Emily) \| 不是欄位邊界:這一列是 3 欄而不是 4 欄
    expect(fix.widestColumns).toBe(3);
    expect(fix.recoveredCells).toBe(1);
    expect(cellsOf(fix.markdown)[0]).toHaveLength(3);
  });
});
