/**
 * Info: (20260811 - Emily) 既有草稿裡的 mermaid timeline → 表格
 * (issue_drafts/open/20 第 2 張票的後半)。
 *
 * 產表端已改成直接輸出表格,但既有草稿的 markdown 裡存著改動前產生的 timeline 區塊。
 * 實測那份 54 頁的下載仍是縮到 28%、字級 4.5px 的彩虹軸 ——
 * 產生器的修正只影響下一次生成,而重新產生整份報告要再燒一次 LLM 額度。
 */
import { describe, it, expect } from "@jest/globals";
import { convertTimelineBlocksToTables } from "@/lib/utils/markdown_timeline_table";
import { MILESTONE_EMPTY_EVENT } from "@/constants/carbon_report_diagrams";

const block = (...lines: string[]): string =>
  ["```mermaid", "timeline", ...lines, "```"].join("\n");

describe("convertTimelineBlocksToTables", () => {
  it("should turn a timeline block into a two-column table", () => {
    const out = convertTimelineBlocksToTables(
      block(
        "    1966年01月 : 公司創立於高雄市",
        "    1968年06月 : 榮獲經濟部中央標準局鍍鋅鋼管正字標記",
      ),
    );

    expect(out).not.toContain("```mermaid");
    expect(out).toContain("| 時間 | 事件 |");
    expect(out).toContain("| --- | --- |");
    expect(out).toContain("| 1966年01月 | 公司創立於高雄市 |");
  });

  it("should give each event of one period its own row, period only on the first", () => {
    const out = convertTimelineBlocksToTables(
      block("    1968年06月 : 鍍鋅鋼管正字標記 : 黑鋼管正字標記"),
    );

    expect(out).toContain("| 1968年06月 | 鍍鋅鋼管正字標記 |");
    expect(out).toContain("|  | 黑鋼管正字標記 |");
  });

  it("should accept a full-width colon", () => {
    const out = convertTimelineBlocksToTables(
      block("    1966年01月：公司創立於高雄市"),
    );

    expect(out).toContain("| 1966年01月 | 公司創立於高雄市 |");
  });

  it("should lift a title above the table and turn a section into a spanning row", () => {
    const out = convertTimelineBlocksToTables(
      block(
        "    title 公司沿革",
        "    section 創業期",
        "    1966年01月 : 公司創立於高雄市",
      ),
    );

    expect(out.indexOf("**公司沿革**")).toBeLessThan(
      out.indexOf("| 時間 | 事件 |"),
    );
    // Info: (20260811 - Emily) 只有第一格有內容的列,annotateTable 會渲染成橫跨整表的分隔列
    expect(out).toContain("| 創業期 |  |");
  });

  it("should escape a pipe inside the event text", () => {
    const out = convertTimelineBlocksToTables(
      block("    1968年06月 : 正字標記|甲等"),
    );

    expect(out).toContain("| 1968年06月 | 正字標記\\|甲等 |");
  });

  /**
   * Info: (20260812 - Emily) 事件欄放明示的破折號,不能留空。
   *
   * 空的話這一列與 `section` 產生的列形狀完全相同(第一格有內容、其餘皆空),
   * 而 `carbon_report_html` 的 `isGroupRow` 正是這個判準 ——
   * 於是一個資料點被渲染成橫跨整表的章節分隔列。
   * 原本這條斷言的是 `| 1990年03月 |  |`,也就是**釘住了那個 bug**。
   */
  it("should keep a period that has no event rather than drop it", () => {
    const out = convertTimelineBlocksToTables(block("    1990年03月"));

    expect(out).toContain(`| 1990年03月 | ${MILESTONE_EMPTY_EVENT} |`);
  });

  // Info: (20260812 - Emily) 與 section 的列(第一格有內容、其餘皆空)必須分得開
  it("should not take the shape of a section row", () => {
    const out = convertTimelineBlocksToTables(block("    1990年03月"));

    expect(out).not.toContain("| 1990年03月 |  |");
  });

  it("should be idempotent", () => {
    const once = convertTimelineBlocksToTables(
      block("    1966年01月 : 公司創立於高雄市"),
    );

    expect(convertTimelineBlocksToTables(once)).toBe(once);
  });

  it("should leave other mermaid diagrams alone", () => {
    const flowchart = ["```mermaid", "flowchart TD", "  a --> b", "```"].join(
      "\n",
    );

    expect(convertTimelineBlocksToTables(flowchart)).toBe(flowchart);
  });

  it("should keep an empty timeline block rather than replace it with an empty table", () => {
    // Info: (20260811 - Emily) 把看不懂的區塊換成空表格會讓內容消失,而消失是無聲的
    const empty = block();

    expect(convertTimelineBlocksToTables(empty)).toBe(empty);
  });
});

/**
 * Info: (20260812 - Emily) 圍籬換成表格之後,緊接在後的那一行會被當成表格的續列
 * 吃掉(PR review 第 3 點)。產生器產出的形狀兩側本來就有空行不會中,
 * 但手動編輯過的草稿會 —— 而消失是無聲的。
 */
describe("convertTimelineBlocksToTables 與相鄰的內容", () => {
  it("should not swallow the paragraph that follows the fence", () => {
    const out = convertTimelineBlocksToTables(
      ["前文", "```mermaid", "timeline", "  1966 : 創立", "```", "後文"].join(
        "\n",
      ),
    );

    // Info: (20260812 - Emily) 後文與表格之間必須有空行,否則 markdown 把它當續列
    expect(out).toMatch(/\|\n\n?後文/);
    expect(out.split("\n").some((line) => line.trim() === "後文")).toBe(true);
  });

  it("should keep the paragraph before the fence separate too", () => {
    const out = convertTimelineBlocksToTables(
      ["前文", "```mermaid", "timeline", "  1966 : 創立", "```"].join("\n"),
    );

    expect(out.split("\n").some((line) => line.trim() === "前文")).toBe(true);
  });
});

/**
 * Info: (20260812 - Emily) 冒號只有第一個切時間標籤,事件之間只認前後有空白的冒號。
 *
 * 原本無條件 split(/[:：]/) 比 mermaid 本身更 aggressive(mermaid 只認半角),
 * 把一個里程碑劈成兩列,而多出來那一列的內容根本不是事件。
 */
describe("convertTimelineBlocksToTables colon handling", () => {
  const rowsOf = (markdown: string): string[] =>
    convertTimelineBlocksToTables(markdown)
      .split("\n")
      .filter((line) => line.startsWith("|") && !line.includes("---"))
      .slice(1);

  it("should keep a full-width colon inside the event text", () => {
    const rows = rowsOf(
      [
        "```mermaid",
        "timeline",
        "  2010 : 取得 ISO 14001：2015 認證",
        "```",
      ].join("\n"),
    );

    expect(rows).toEqual(["| 2010 | 取得 ISO 14001：2015 認證 |"]);
  });

  it("should keep a standard number that contains a colon", () => {
    const rows = rowsOf(
      ["```mermaid", "timeline", "  2018 : 導入 ISO 14064-1:2018", "```"].join(
        "\n",
      ),
    );

    expect(rows).toEqual(["| 2018 | 導入 ISO 14064-1:2018 |"]);
  });

  it("should keep a url in one piece", () => {
    const rows = rowsOf(
      ["```mermaid", "timeline", "  2024 : 見 https://example.com", "```"].join(
        "\n",
      ),
    );

    expect(rows).toEqual(["| 2024 | 見 https://example.com |"]);
  });

  /**
   * Info: (20260813 - Emily) 沒有時間標籤的那種行,第一個冒號往往不是分隔符。
   *
   * 上面幾條測的都是「有時間標籤」的行(第一個冒號就是 ` : `),而這支刻意支援
   * 沒有時間標籤的行 —— 那種行裡的 `https://` 與 `14064-1:2018` 會被當成分隔符,
   * 憑空生出一個假的時間標籤。內容不見得少一個字,但它宣稱了原文沒有的東西。
   */
  it("should not treat a url scheme colon as the period separator", () => {
    const rows = rowsOf(block("  參考 https://a.example/x"));

    expect(rows).toEqual([
      `| 參考 https://a.example/x | ${MILESTONE_EMPTY_EVENT} |`,
    ]);
  });

  it("should not treat a digit-flanked colon as the period separator", () => {
    const rows = rowsOf(block("  ISO 14064-1:2018 查證聲明"));

    expect(rows).toEqual([
      `| ISO 14064-1:2018 查證聲明 | ${MILESTONE_EMPTY_EVENT} |`,
    ]);
  });

  // Info: (20260813 - Emily) 時刻標籤:切在 ` : ` 而不是 `12:` 上
  it("should split on the separator, not on a clock time in the period", () => {
    const rows = rowsOf(block("  12:30 : 停爐檢修"));

    expect(rows).toEqual(["| 12:30 | 停爐檢修 |"]);
  });

  // Info: (20260812 - Emily) mermaid 的多事件寫法(冒號兩側有空白)仍須切開
  it("should still split multiple events written the mermaid way", () => {
    const rows = rowsOf(
      ["```mermaid", "timeline", "  1966 : 創立 : 遷廠 : 上市", "```"].join(
        "\n",
      ),
    );

    expect(rows).toEqual(["| 1966 | 創立 |", "|  | 遷廠 |", "|  | 上市 |"]);
  });
});
