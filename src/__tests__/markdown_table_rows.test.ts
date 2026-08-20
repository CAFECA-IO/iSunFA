import {
  joinWrappedTableRows,
  MAX_CONTINUATION_LINES,
} from "@/lib/utils/markdown_table_rows";
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
      maxContinuations: 0,
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

  /**
   * Info: (20260820 - Emily) 素材改成跟著 `MAX_CONTINUATION_LINES` 走。
   *
   * 原本寫死 5 個續行 —— 上限是 4 的時候那剛好超過。08-20 把上限放寬到 32 之後
   * 這條測試變綠了,而它要驗的**規則**(超過上限就整段放棄)一點都沒有失效,
   * 失效的是素材綁死了那個數字。所以改成由上限推出素材,
   * 下一次有人再動上限,這條測試仍然在驗同一件事。
   */
  it("should give up entirely when the row never closes within the cap", () => {
    const source = [
      "| 甲 | 乙 |",
      "| 開頭 | 這一列",
      ...Array.from(
        { length: MAX_CONTINUATION_LINES },
        (_, index) => `永遠都不會收尾的第${index}段`,
      ),
      "終於收尾 |",
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
      maxContinuations: 0,
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
      maxContinuations: 0,
    });
  });

  it("should not swallow prose that happens to end with a pipe", () => {
    // Info: (20260814 - Emily) 沒有護欄時會變成 "| 1 | 2接下來是一段話 |"
    const source = ["| 1 | 2", "接下來是一段話 |"].join("\n");

    expect(joinWrappedTableRows(source)).toEqual({
      markdown: source,
      joined: 0,
      maxContinuations: 0,
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

/**
 * Info: (20260820 - Emily) 續行上限從 4 放寬到 32 —— 08-20 run D 的實測依據。
 *
 * 那一趟 `表4.4` 與 `表4.8` 被 `not_a_table` 整張丟掉（表4.8 是 173 列）。
 * 量測 log 裡那兩份 payload 的每一段折斷:
 *
 *     表4.4  4 段,所需續行數 5 / 5 / 6 / 16
 *     表4.8  16 段,所需續行數 6…29
 *
 * 每一段都超過舊上限 4,所以每一列都放棄接回。
 * 下面那個表頭是從 `data/scratch/t4.4_run_d.txt` 逐字取的第 9–25 行,
 * 一列被折成 17 行 —— 素材是本尊,不是我另編一個看起來像的。
 */
describe("續行上限放寬到 32（08-20 run D）", () => {
  const RUN_D_HEADER = [
    "| | | | 95%信賴",
    "區間之下",
    "限 | 95%信賴",
    "區間之上",
    "限 | 溫室",
    "氣體 | 溫室氣體排",
    "放當量(噸",
    "CO₂ e/年) | 95%信賴",
    "區間之下",
    "限 | 95%信賴",
    "區間之上",
    "限 | 單一溫室氣體不確定",
    "性 | 95%信賴",
    "區間之下",
    "限 | 95%信賴",
    "區間之上",
    "限 | |",
  ];
  // Info: (20260820 - Emily) hasClosedRow 需要全文至少一列閉合 —— 原 payload 有 9 列
  const RUN_D_TABLE = [...RUN_D_HEADER, "| 1 | 2 | 3 |"].join("\n");

  it("被折成 17 行的表頭接得回來", () => {
    const result = joinWrappedTableRows(RUN_D_TABLE);

    expect(result.joined).toBe(1);
    expect(result.markdown.split("\n")[0]).toContain("95%信賴區間之下限");
    expect(result.markdown.split("\n")[0]).toContain("溫室氣體排放當量");
  });

  it("接回來的那一列是一行，欄數合理", () => {
    const first = joinWrappedTableRows(RUN_D_TABLE).markdown.split("\n")[0];

    expect(first.startsWith("|")).toBe(true);
    expect(first.endsWith("|")).toBe(true);
    expect(first.split("|").length - 2).toBeGreaterThan(8);
  });

  /**
   * Info: (20260820 - Emily) 放寬不能是靜默的 —— 呼叫端要記 log,
   * 所以用掉幾個續行必須回報得出來。
   */
  it("回報實際用掉的最大續行數", () => {
    expect(joinWrappedTableRows(RUN_D_TABLE).maxContinuations).toBe(16);
  });

  /**
   * Info: (20260820 - Emily) 反向對照:放寬的只有續行數這一道。
   * 擋住「兩列併成一列」的兩道護欄都沒動,這兩條要證明它們還在。
   */
  it("續行以 `|` 開頭時仍然不接（那是另一列，不是折斷）", () => {
    const twoRows = ["| 甲 | 乙", "| 1 | 2 |", "| 3 | 4 |"].join("\n");
    const result = joinWrappedTableRows(twoRows);

    expect(result.joined).toBe(0);
    expect(result.markdown).toBe(twoRows);
  });

  it("全文沒有任何一列閉合時仍然整段放棄", () => {
    const noClosed = ["| 甲 | 乙", "1 | 2", "3 | 4"].join("\n");
    const result = joinWrappedTableRows(noClosed);

    expect(result.joined).toBe(0);
    expect(result.maxContinuations).toBe(0);
  });

  it("空行仍然是段落邊界（散文不會被吸進表格列）", () => {
    const withBlank = [
      "| 甲 | 乙",
      "",
      "這是一段散文，不該被接進上面那一列。",
      "| 1 | 2 |",
    ].join("\n");

    expect(joinWrappedTableRows(withBlank).joined).toBe(0);
  });
});
