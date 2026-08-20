/**
 * Info: (20260814 - Emily) 缺分隔列的原文表格（issue 27）。
 *
 * 樣本全部取自 2026-08-14 匯入 UAT 的 log —— 那四張被 `not_a_table` 丟掉的表，
 * 其中兩張還被內文引用。
 */
import { describe, it, expect } from "@jest/globals";
import {
  countTableCells,
  ensureTableDivider,
  trimRowsToDividerWidth,
} from "@/lib/utils/markdown_table_divider";

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

/**
 * Info: (20260819 - Emily) `open/47` 第三種形狀:表頭被壓成一個超寬的邏輯列。
 *
 * 08-19 run2 實測 —— `表3.4` 的表頭是**一個約 600 格的列**(原文是兩層合併表頭),
 * 而「連續欄數一致」的那一段是它下面的 6 欄資料列。
 * 舊行為:分隔列補在資料列之後 → 上面那一列仍然沒有分隔列 →
 * GFM 整個區塊都不渲染 → 紙上 1,273 個管線、19 條 `|---|---|`。
 */
describe("表頭在一致列上面時不補（open/47 第三種形狀）", () => {
  const runawayHeader = [
    `| 排放類型 | 活動或設施 | 排放源 | 年活動數據資訊 |${" |".repeat(40)}`,
    "| 1.1 固定式燃燒 | 緊急發電機 | 柴油 | 發電機試運轉表單 | 測試單位 | 自行評估 |",
    "| 1.2 移動式燃燒 | 公務車 | 車用汽油 | 差旅費報告表 | 管理部 | 財務會計評估 |",
    "| 1.4 人為系統/逸散 | 冰水機 | HCFC-22 | 2023 冰水機 | 管理部 | 財務會計評估 |",
  ].join("\n");

  it("不插入分隔列", () => {
    expect(ensureTableDivider(runawayHeader).inserted).toBe(false);
  });

  it("原樣返回，一個字都不改", () => {
    expect(ensureTableDivider(runawayHeader).markdown).toBe(runawayHeader);
  });

  /**
   * Info: (20260819 - Emily) 這一條才是重點:放棄要**說出來**。
   * 沒有這個欄位,呼叫端就記不了 log,而那張表接下來會被驗證器擋掉 ——
   * 結果是「報告莫名少一張表」而沒有任何原因可查。
   */
  it("回報放棄的原因，讓呼叫端記得出來", () => {
    expect(ensureTableDivider(runawayHeader).skipped).toBe(
      "rows_above_consistent_run",
    );
  });

  /**
   * Info: (20260819 - Emily) 反向控制:一致列**就是**第一列的正常表照樣要補。
   * 沒有這一條,把守衛寫成「一律不補」也會讓上面三條綠。
   */
  it("一致列就是第一列時照樣補（守衛沒有把功能關掉）", () => {
    const normal = [
      "| 設施/活動 | 溫室氣體源 | 種類 | 備註 |",
      "| | | CO2 | （類別） |",
      "| 緊急發電機 | 柴油 | V | 類別一 |",
    ].join("\n");
    const result = ensureTableDivider(normal);

    expect(result.inserted).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(result.markdown.split("\n")[1]).toContain("---");
  });

  it("標題行在表格之前不算表格列（不會誤判成表頭在上）", () => {
    const withCaption = [
      "表3.1 排放源鑑別（原文照錄 p.15）",
      "| 設施 | 來源 | 種類 |",
      "| 發電機 | 柴油 | CO2 |",
      "| 公務車 | 汽油 | CO2 |",
    ].join("\n");

    expect(ensureTableDivider(withCaption).inserted).toBe(true);
  });
});

/**
 * Info: (20260820 - Emily) `trimRowsToDividerWidth` —— open/47 的第四種形狀。
 *
 * 08-20 run C 的 log 逐字給了 `表3.4` 被丟的原因與內容：第一列 **547 格、
 * 只有 5 格有字**，分隔列 6 格，其後 14 列資料全部 6 格。
 * 下面那個表頭就是照那筆 log 重建的（欄數、字串都取自本尊），
 * 不是我另編一個看起來像的輸入。
 */
describe("trimRowsToDividerWidth 只裁空白，不裁內容", () => {
  // Info: (20260820 - Emily) 547 格 = 4 個有字的表頭 + 541 個空格 + 1 格 `-`
  const RUN_C_HEADER = `| 排放類型 | 活動或設施 | 排放源 | 年活動數據資訊 ${"| ".repeat(541)}|-|`;
  const RUN_C_TABLE = [
    RUN_C_HEADER,
    "| --- | --- | --- | --- | --- | --- |",
    "| | | | 數據來源表單名稱 | 保存單位 | 活動數據種類 |",
    "| (1) 總公司 | | | | | |",
    "| 1.1 固定式燃燒 | 緊急發電機 | 柴油 | 發電機試運轉表單 | 測試單位 | 自行評估 |",
  ].join("\n");

  it("run C 的表3.4 表頭被裁到分隔列的欄數", () => {
    const result = trimRowsToDividerWidth(RUN_C_TABLE);
    const lines = result.markdown.split("\n");

    expect(result.trimmed).toBe(1);
    expect(countTableCells(lines[0])).toBe(countTableCells(lines[1]));
  });

  it("裁掉的只有空白 —— 四個表頭字串一個都沒少", () => {
    const trimmedHeader =
      trimRowsToDividerWidth(RUN_C_TABLE).markdown.split("\n")[0];

    ["排放類型", "活動或設施", "排放源", "年活動數據資訊"].forEach((label) => {
      expect(trimmedHeader).toContain(label);
    });
  });

  it("裁完之後 validateSourceTables 認得它是表格（丟表的原因消失）", () => {
    const trimmed = trimRowsToDividerWidth(RUN_C_TABLE).markdown;
    const lines = trimmed.split("\n");
    const widths = lines.map((line) => countTableCells(line));

    expect(new Set(widths).size).toBe(1);
  });

  /**
   * Info: (20260820 - Emily) 反向對照：超出的部分只要有一格有字就不裁。
   * 裁掉有字的格會把一整欄的數字移位 —— 那比丟一張表嚴重得多。
   */
  it("超出的欄位有實質內容時不裁，交回原樣", () => {
    const withContent = [
      "| 設施 | 來源 | 種類 | 備註 | 額外資料 |",
      "| --- | --- | --- |",
      "| 發電機 | 柴油 | CO2 |",
    ].join("\n");
    const result = trimRowsToDividerWidth(withContent);

    expect(result.trimmed).toBe(0);
    expect(result.markdown).toBe(withContent);
  });

  it("沒有分隔列時什麼都不做（那條路由 ensureTableDivider 負責）", () => {
    const noDivider = ["| a | b |", "| c | d |"].join("\n");

    expect(trimRowsToDividerWidth(noDivider).trimmed).toBe(0);
  });

  it("是冪等的", () => {
    const once = trimRowsToDividerWidth(RUN_C_TABLE).markdown;

    expect(trimRowsToDividerWidth(once).markdown).toBe(once);
    expect(trimRowsToDividerWidth(once).trimmed).toBe(0);
  });
});
