import { joinWrappedTableRows } from "@/lib/utils/markdown_table_rows";
import { ensureTableDivider } from "@/lib/utils/markdown_table_divider";

/**
 * Info: (20260814 - Emily) 素材全部來自 2026-08-14 匯入 log 的 `head` 欄位
 * (`data/issue_drafts/open/28_source_table_cell_newline.md`)。
 *
 * 這件事很重要：這個缺陷是**偶發**的（同一份原檔、同一個 commit，
 * 一趟丟三張表、另一趟零張），所以不能靠重跑匯入取樣本。
 * log 是唯一的證物，本檔就是把它釘住。
 */
describe("joinWrappedTableRows", () => {
  it("should rejoin 表4.1 的表頭（log 實際字串，三行一列）", () => {
    // Info: (20260814 - Emily) log: source table dropped 表4.1 not_a_table lineCount 8
    const source = [
      "| 等級 | 活動數據之",
      "不確定性 | CO2 之排放係數",
      "不確定性 | 定性/定量 |",
      "| 高 | ±20% | ±10% | 定量 |",
      "| 中 | ±10% | ±5% | 定量 |",
    ].join("\n");

    const result = joinWrappedTableRows(source);

    expect(result.joined).toBe(1);
    expect(result.markdown.split("\n")[0]).toBe(
      "| 等級 | 活動數據之不確定性 | CO2 之排放係數不確定性 | 定性/定量 |",
    );
  });

  it("should rejoin 表4.4 的表頭（含空欄位與折在欄位中間的兩個續行）", () => {
    // Info: (20260814 - Emily) log head: ["| 排放類型 | | | 活動數據之不確定性 | ... | 數據","精準","程度 |"]
    const source = [
      "| 排放類型 | | | 活動數據之不確定性 | 排放係數之不確定性 | 數據",
      "精準",
      "程度 |",
      "| 類別一 | 固定燃燒 | 柴油 | ±5% | ±2% | 高 |",
      "| 類別二 | 外購電力 | 電力 | ±1% | ±3% | 高 |",
    ].join("\n");

    const result = joinWrappedTableRows(source);

    expect(result.joined).toBe(1);
    expect(result.markdown.split("\n")[0]).toBe(
      "| 排放類型 | | | 活動數據之不確定性 | 排放係數之不確定性 | 數據精準程度 |",
    );
  });

  it("should rejoin 表4.8 的表頭（log head 只到第四行的中途）", () => {
    /**
     * Info: (20260814 - Emily) log head: ["| 排放類型 | 活動","或設","施 | 排放源 | 類"]
     * —— 只截到前三行，第四行以後 log 沒有留。
     * 這裡補一個以 `|` 收尾的第四行把樣本補完，補的部分**不是** log 原文。
     */
    const source = [
      "| 排放類型 | 活動",
      "或設",
      "施 | 排放源 | 類",
      "別 |",
      "| 類別一 | 加熱爐 | 天然氣 | 直接 |",
      "| 類別一 | 堆高機 | 柴油 | 直接 |",
    ].join("\n");

    const result = joinWrappedTableRows(source);

    expect(result.joined).toBe(1);
    expect(result.markdown.split("\n")[0]).toBe(
      "| 排放類型 | 活動或設施 | 排放源 | 類別 |",
    );
  });

  it("should be idempotent on a well formed table", () => {
    const source = [
      "| 甲 | 乙 |",
      "| --- | --- |",
      "| 1 | 2 |",
      "| 3 | 4 |",
    ].join("\n");

    const first = joinWrappedTableRows(source);
    const second = joinWrappedTableRows(first.markdown);

    expect(first.joined).toBe(0);
    expect(first.markdown).toBe(source);
    expect(second.markdown).toBe(source);
  });

  /**
   * Info: (20260814 - Emily) 接錯比不接嚴重：把兩列併成一列會讓後面每一格往左移一位，
   * 而表格看起來完全正常。以下五條是那個護欄。
   */
  it("should not join at all when no row in the block is closed", () => {
    /**
     * Info: (20260814 - Emily) GFM 允許省略首尾的 `|`。全文找不到一列閉合的時候，
     * 「未閉合」是這張表的慣例而不是異常 —— 硬接會把數列併成一列。
     */
    const source = ["| 甲 | 乙", "丙 | 丁 |"].join("\n");

    expect(joinWrappedTableRows(source)).toEqual({
      markdown: source,
      joined: 0,
    });
  });

  it("should not merge two rows when the next line starts with a pipe", () => {
    const source = ["| 甲 | 乙", "| 丙 | 丁 |"].join("\n");

    const result = joinWrappedTableRows(source);

    expect(result.joined).toBe(0);
    expect(result.markdown).toBe(source);
  });

  it("should not swallow a paragraph across a blank line", () => {
    const source = [
      "| 甲 | 乙",
      "",
      "這是一段散文，結尾剛好有一個 |",
      "| 1 | 2 |",
    ].join("\n");

    const result = joinWrappedTableRows(source);

    expect(result.joined).toBe(0);
    expect(result.markdown).toBe(source);
  });

  it("should give up entirely when the row never closes within the cap", () => {
    const source = [
      "| 甲 | 乙 |",
      "| 開頭 | 這一列",
      "永遠",
      "都不",
      "會收",
      "尾所以要放棄",
      "第六行才收尾 |",
    ].join("\n");

    const result = joinWrappedTableRows(source);

    expect(result.joined).toBe(0);
    expect(result.markdown).toBe(source);
  });

  it("should not produce a single cell row", () => {
    // Info: (20260814 - Emily) 接完只有一格 —— 那不是列，是一段以 `|` 開頭的文字
    const source = ["| 甲 | 乙 |", "| 這段話沒有分隔", "只是被折斷了 |"].join(
      "\n",
    );

    const result = joinWrappedTableRows(source);

    expect(result.joined).toBe(0);
    expect(result.markdown).toBe(source);
  });

  it("should join CJK without a space and ASCII with one", () => {
    const cjk = joinWrappedTableRows(
      ["| 甲 | 活動", "數據 | 乙 |", "| 1 | 2 | 3 |"].join("\n"),
    );
    const ascii = joinWrappedTableRows(
      ["| a | emission", "factor | b |", "| 1 | 2 | 3 |"].join("\n"),
    );

    expect(cjk.markdown.split("\n")[0]).toBe("| 甲 | 活動數據 | 乙 |");
    expect(ascii.markdown.split("\n")[0]).toBe("| a | emission factor | b |");
  });

  it("should count every rejoined row", () => {
    const source = ["| 甲 | 乙", "丙 |", "| 1 | 2 |", "| 3 | 4", "5 |"].join(
      "\n",
    );

    const result = joinWrappedTableRows(source);

    expect(result.joined).toBe(2);
    expect(result.markdown.split("\n")).toHaveLength(3);
  });

  it("should preserve indentation of the row it rejoins", () => {
    const result = joinWrappedTableRows(
      ["  | 甲 | 乙", "  丙 |", "  | 1 | 2 |"].join("\n"),
    );

    expect(result.markdown.split("\n")[0]).toBe("  | 甲 | 乙丙 |");
  });

  it("should leave non table content untouched", () => {
    const source = ["# 標題", "", "一段散文。", "", "另一段散文。"].join("\n");

    expect(joinWrappedTableRows(source)).toEqual({
      markdown: source,
      joined: 0,
    });
  });
});

/**
 * Info: (20260814 - Emily) 順序驗證：先接回列的邊界，再補分隔列。
 * 反過來不行 —— `ensureTableDivider` 的判準是「連續多列欄數一致」，
 * 而一列被切成三行之後每行的 `|` 數量都不一樣，那個判準對它不成立。
 */
describe("joinWrappedTableRows + ensureTableDivider", () => {
  const wrapped = [
    "| 等級 | 活動數據之",
    "不確定性 | CO2 之排放係數",
    "不確定性 | 定性/定量 |",
    "| 高 | ±20% | ±10% | 定量 |",
    "| 中 | ±10% | ±5% | 定量 |",
  ].join("\n");

  it("should stay unfixable when the divider pass runs alone", () => {
    expect(ensureTableDivider(wrapped).inserted).toBe(false);
  });

  it("should end up as a valid GFM table when the row pass runs first", () => {
    const joined = joinWrappedTableRows(wrapped);
    const divided = ensureTableDivider(joined.markdown);

    expect(joined.joined).toBe(1);
    expect(divided.inserted).toBe(true);
    expect(divided.markdown.split("\n")[1]).toBe("| --- | --- | --- | --- |");
  });
});

/**
 * Info: (20260814 - Emily) 這三條釘住的是**故意不修**的形狀。
 * 每一條都是實際探測出來會被接壞的輸入，護欄加上之後才變成原樣返回 ——
 * 沒有這些測試，下一個人放寬護欄時不會知道自己放掉了什麼。
 */
describe("joinWrappedTableRows 的護欄", () => {
  it("should not touch a GFM table that omits leading and trailing pipes", () => {
    // Info: (20260814 - Emily) 沒有護欄時會變成 "| 甲 | 乙1 | 2 3 | 4 |" —— 三列併成一列
    const source = ["| 甲 | 乙", "1 | 2", "3 | 4 |"].join("\n");

    expect(joinWrappedTableRows(source)).toEqual({
      markdown: source,
      joined: 0,
    });
  });

  it("should not swallow prose that happens to end with a pipe", () => {
    // Info: (20260814 - Emily) 沒有護欄時會變成 "| 1 | 2接下來是一段話 |"
    const source = ["| 1 | 2", "接下來是一段話 |"].join("\n");

    expect(joinWrappedTableRows(source)).toEqual({
      markdown: source,
      joined: 0,
    });
  });

  it("should rejoin a folded divider row into a valid divider", () => {
    // Info: (20260814 - Emily) 補空白的版本會產生 "| --- | --- --- |"，那不是合法分隔格
    const source = [
      "| 甲 | 乙 | 丙 |",
      "| --- | ---",
      "--- |",
      "| 1 | 2 | 3 |",
    ].join("\n");

    const result = joinWrappedTableRows(source);

    expect(result.joined).toBe(1);
    expect(result.markdown.split("\n")[1]).toBe("| --- | ------ |");
    expect(/^\|[\s:|-]+\|$/.test(result.markdown.split("\n")[1])).toBe(true);
  });

  it("should keep an escaped pipe inside one cell", () => {
    const result = joinWrappedTableRows(
      ["| 甲 | a\\|b", "尾 |", "| 1 | 2 |"].join("\n"),
    );

    expect(result.markdown.split("\n")[0]).toBe("| 甲 | a\\|b尾 |");
  });
});
