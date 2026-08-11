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

  it("should keep a period that has no event rather than drop it", () => {
    const out = convertTimelineBlocksToTables(block("    1990年03月"));

    expect(out).toContain("| 1990年03月 |  |");
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
