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
import {
  padAllTableHeaders,
  padTableHeaderToWidest,
} from "@/lib/utils/markdown_table_columns";

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

/**
 * Info: (20260812 - Emily) 表格範圍與欄位對應(PR review)。
 */
describe("padTableHeaderToWidest 的表格邊界", () => {
  const TWO_TABLES = [
    "| A | B |",
    "| --- | --- |",
    "| 1 | 2 |",
    "",
    "文字段落",
    "",
    "| C | D | E | F |",
    "| --- | --- | --- | --- |",
    "| 3 | 4 | 5 | 6 |",
  ].join("\n");

  /**
   * Info: (20260812 - Emily) 原本資料列的蒐集掃到檔尾,第二張表的欄數被算進第一張。
   * 實測第一張被補成 4 欄、憑空多兩條空欄,而 log 回報 recovered 4 cells ——
   * 一個假的成功。
   */
  it("should not let a later table widen an earlier one", () => {
    const fix = padTableHeaderToWidest(TWO_TABLES);

    expect(fix.headerColumns).toBe(2);
    expect(fix.widestColumns).toBe(2);
    expect(fix.recoveredCells).toBe(0);
    expect(fix.markdown).toBe(TWO_TABLES);
  });

  // Info: (20260812 - Emily) 圍籬裡含直線的行不是表格列
  it("should ignore pipes inside a fenced code block", () => {
    const fenced = ["```", "| A | B |", "| --- | --- |", "```"].join("\n");

    expect(padTableHeaderToWidest(fenced).recoveredCells).toBe(0);
    expect(padAllTableHeaders(fenced)).toBe(fenced);
  });

  /**
   * Info: (20260812 - Emily) 「每格都是破折號」的資料列(`| - | - |`,
   * 「本項無資料」最常見的寫法)一模一樣符合 `DIVIDER`。
   *
   * 第一版拿 `DIVIDER` 當資料列的中止條件,於是掃描停在那裡,
   * 它後面更寬的列一格都沒量到 —— recoveredCells 從 1 變 0,
   * 這支工具存在的理由在它自己的邊界邏輯上復發,而且同樣沒有任何錯誤。
   */
  it("should keep measuring past a data row that looks like a divider", () => {
    const dashRow = [
      "| 甲 | 乙 |",
      "| --- | --- |",
      "| - | - |",
      "| 1 | 2 | 不可以掉 |",
    ].join("\n");

    const fix = padTableHeaderToWidest(dashRow);

    expect(fix.headerColumns).toBe(2);
    expect(fix.widestColumns).toBe(3);
    expect(fix.recoveredCells).toBe(1);
    expect(fix.markdown).toContain("| 甲 | 乙 |  |");
  });

  /**
   * Info: (20260812 - Emily) 掃到非表格列才停,不會誤併兩張表:
   * GFM 只認表頭下一列那個分隔列,中間再出現的 `| --- | --- |` 對它而言就是資料列。
   * 所以「連著寫、沒有空行隔開」的兩張表本來就是一張,這裡與渲染器同一個看法。
   */
  it("should treat an adjacent divider row as body, matching GFM", () => {
    const glued = [
      "| 甲 | 乙 |",
      "| --- | --- |",
      "| 1 | 2 |",
      "| 丙 | 丁 |",
      "| --- | --- |",
      "| 3 | 4 | 也不可以掉 |",
    ].join("\n");

    const fix = padTableHeaderToWidest(glued);

    expect(fix.widestColumns).toBe(3);
    expect(fix.recoveredCells).toBe(1);
  });
});

/**
 * Info: (20260812 - Emily) 補欄**不**修表頭標籤與資料欄的對應。
 *
 * 這一組釘住的是「補欄沒有移動任何既有標籤」——
 * 原本的斷言是「每列都是 10 欄」,那條放過了對應關係本身。
 */
describe("padTableHeaderToWidest 的欄位對應", () => {
  const NARROW = [
    "| 項目 | 排放量 | 備註 |",
    "| --- | --- | --- |",
    "| 甲類 | 1.2 | 3.4 | 5.6 | 說明 |",
  ].join("\n");

  const pairs = (markdown: string): string[] => {
    const rows = markdown
      .split("\n")
      .filter((line) => line.startsWith("|") && !line.includes("---"))
      .map((line) =>
        line
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim()),
      );
    return rows[0].map(
      (header, index) => `${header || "(空)"}↔${rows[1][index] ?? "(無)"}`,
    );
  };

  it("should keep every existing label over the same data column", () => {
    const before = pairs(NARROW);
    const after = pairs(padTableHeaderToWidest(NARROW).markdown);

    // Info: (20260812 - Emily) 既有三欄的對應完全不變
    expect(after.slice(0, 3)).toEqual(before.slice(0, 3));
    // Info: (20260812 - Emily) 補出來的欄沒有標籤 —— 刻意不猜它該叫什麼
    expect(after.slice(3)).toEqual(["(空)↔5.6", "(空)↔說明"]);
  });

  /**
   * Info: (20260812 - Emily) 第二層表頭要回報,那種表的標籤需要人工對照原文。
   */
  it("should report a second header level", () => {
    const twoLevel = [
      "| 項目 | 排放量 |",
      "| --- | --- |",
      "|  | CO2 | CH4 |",
      "| 甲類 | 1 | 2 |",
    ].join("\n");

    expect(padTableHeaderToWidest(twoLevel).hasSecondHeaderLevel).toBe(true);
    expect(padTableHeaderToWidest(NARROW).hasSecondHeaderLevel).toBe(false);
  });
});

/**
 * Info: (20260812 - Emily) 讀取端要能修整份文件裡的每一張表 ——
 * 既有草稿的表頭已經是窄的,匯入端修不到它們。
 */
describe("padAllTableHeaders", () => {
  it("should widen every narrow table in the document", () => {
    const document = [
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 | 3 |",
      "",
      "| C | D |",
      "| --- | --- |",
      "| 4 | 5 | 6 |",
    ].join("\n");
    const out = padAllTableHeaders(document).split("\n");

    expect(out[0]).toBe("| A | B |  |");
    expect(out[4]).toBe("| C | D |  |");
  });

  it("should be idempotent", () => {
    const document = ["| A | B |", "| --- | --- |", "| 1 | 2 | 3 |"].join("\n");
    const once = padAllTableHeaders(document);

    expect(padAllTableHeaders(once)).toBe(once);
  });

  it("should leave a document without tables untouched", () => {
    expect(padAllTableHeaders("純文字\n沒有表格")).toBe("純文字\n沒有表格");
  });
});
