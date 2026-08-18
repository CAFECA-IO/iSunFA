/**
 * Info: (20260814 - Emily) 缺分隔列的原文表格（issue 27）。
 *
 * 樣本全部取自 2026-08-14 匯入 UAT 的 log —— 那四張被 `not_a_table` 丟掉的表，
 * 其中兩張還被內文引用。
 */
import { describe, it, expect } from "@jest/globals";
import { ensureTableDivider } from "@/lib/utils/markdown_table_divider";

// Info: (20260814 - Emily) 表3.1 溫室氣體排放鑑別表：兩層表頭、10 欄、無分隔列
const TABLE_3_1 = [
  "| 設施/活動 | 溫室氣體源 | 可能產生溫室氣體種類 | | | | | | | 備註 |",
  "| | | CO2 | CH4 | N2O | HFCs | PFCs | NF3 | SF6 | （類別） |",
  "| 緊急發電機 | 柴油 | V | V | V | | | | | 類別一 |",
].join("\n");

const rowsOf = (markdown: string): string[] =>
  markdown.split("\n").filter((line) => line.trim().startsWith("|"));

describe("ensureTableDivider", () => {
  it("should insert a divider for a two-level header table", () => {
    const result = ensureTableDivider(TABLE_3_1);

    expect(result.inserted).toBe(true);
    expect(rowsOf(result.markdown)[1]).toBe(
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    );
  });

  // Info: (20260814 - Emily) 補完之後每一列的欄數都還是 10，一格都沒少
  it("should not change any existing cell", () => {
    const before = rowsOf(TABLE_3_1);
    const after = rowsOf(ensureTableDivider(TABLE_3_1).markdown);

    expect(after[0]).toBe(before[0]);
    expect(after.slice(2)).toEqual(before.slice(1));
  });

  // Info: (20260814 - Emily) 表3.2 排放係數管理表：6 欄
  it("should handle the six-column coefficient table", () => {
    const table = [
      "| 設施/活動 | 排放源 | 溫室氣體種類 | 排放係數 | | 資料來源 |",
      "| | | | 數值 | 單位 | |",
      "| 緊急發電機 | 柴油 | CO2 | 2.6060328000 | kgCO2/L | 管理表 6.0.4 版 |",
    ].join("\n");

    const result = ensureTableDivider(table);

    expect(result.inserted).toBe(true);
    expect(rowsOf(result.markdown)[1]).toBe(
      "| --- | --- | --- | --- | --- | --- |",
    );
  });

  /**
   * Info: (20260814 - Emily) 冪等：已經有分隔列的表原樣返回。
   * 匯入端與讀取端都可能跑到，重複套用不得再插一條。
   */
  it("should be idempotent", () => {
    const once = ensureTableDivider(TABLE_3_1).markdown;
    const twice = ensureTableDivider(once);

    expect(twice.inserted).toBe(false);
    expect(twice.markdown).toBe(once);
  });

  it("should leave a well-formed table untouched", () => {
    const wellFormed = [
      "| 甲 | 乙 |",
      "| --- | --- |",
      "| 1 | 2 |",
      "| 3 | 4 |",
    ].join("\n");

    expect(ensureTableDivider(wellFormed)).toEqual({
      markdown: wellFormed,
      inserted: false,
    });
  });

  /**
   * Info: (20260814 - Emily) **這條是把散文擋在外面的判準。**
   *
   * 原本擋散文的是「分隔列的形狀很特定」。拿掉那個之後需要替代品：
   * 連續多列、每列欄數相同。散文不會湊巧出現三行都被直線切成同樣格數。
   */
  it("should not turn prose into a table", () => {
    const prose = [
      "本節說明 | 分隔符號 | 的用法",
      "第二行只有一個 | 直線",
      "第三行沒有直線",
    ].join("\n");

    expect(ensureTableDivider(prose).inserted).toBe(false);
  });

  // Info: (20260814 - Emily) 欄數不一致 = 列的邊界壞了（表4.1 那種），不補
  it("should not insert when the column counts disagree", () => {
    const ragged = [
      "| 等級 | 活動數據之 |",
      "| 不確定性 | CO2 之排放係數 | 定性/定量 |",
      "| 1 | 2 |",
    ].join("\n");

    expect(ensureTableDivider(ragged).inserted).toBe(false);
  });

  // Info: (20260814 - Emily) 兩列太少 —— 兩行剛好同格數並非不可能
  it("should require at least three consistent rows", () => {
    const twoRows = ["| 甲 | 乙 |", "| 1 | 2 |"].join("\n");

    expect(ensureTableDivider(twoRows).inserted).toBe(false);
  });

  /**
   * Info: (20260814 - Emily) 表格前面有原文標題行時，分隔列要插在**表格的**第一列之後，
   * 不是文件的第一行之後。
   */
  it("should skip leading prose before the table", () => {
    const withCaption = ["表3.1 溫室氣體排放鑑別表", "", TABLE_3_1].join("\n");
    const result = ensureTableDivider(withCaption);

    expect(result.inserted).toBe(true);
    expect(result.markdown.split("\n")[0]).toBe("表3.1 溫室氣體排放鑑別表");
    expect(rowsOf(result.markdown)[1]).toContain("---");
  });

  it("should do nothing for content with no rows at all", () => {
    expect(ensureTableDivider("純散文，沒有任何表格。").inserted).toBe(false);
    expect(ensureTableDivider("")).toEqual({ markdown: "", inserted: false });
  });
});
