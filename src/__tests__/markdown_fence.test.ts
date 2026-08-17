/**
 * Info: (20260812 - Emily) 圍籬與縮排 code 的逐行判定。
 *
 * 這支的四種案例都不會拋錯,只會讓保護在該生效的地方失效、
 * 或在不該作用的地方加反斜線 —— 只有測試看得見。
 */
import { describe, it, expect } from "@jest/globals";
import {
  classifyMarkdownLines,
  isMarkdownCodeLine,
  MarkdownLineKind,
} from "@/lib/utils/markdown_fence";

const kindsOf = (...lines: string[]): MarkdownLineKind[] =>
  classifyMarkdownLines(lines);

describe("classifyMarkdownLines", () => {
  it("should mark the fence markers and the code between them", () => {
    expect(kindsOf("前文", "```", "code", "```", "後文")).toEqual([
      MarkdownLineKind.PROSE,
      MarkdownLineKind.FENCE_MARKER,
      MarkdownLineKind.FENCED_CODE,
      MarkdownLineKind.FENCE_MARKER,
      MarkdownLineKind.PROSE,
    ]);
  });

  /**
   * Info: (20260812 - Emily) 這一條是抽出這支函式的主因。
   *
   * 原本兩種圍籬字元共用一個布林旗標,``` 圍籬內只要有一行 `~~~`
   * 旗標就被翻掉,之後整份文件的內外判斷全部相反 ——
   * 一段引用了 `~~~` 的範例文字,可以讓它後面所有算式失去保護。
   */
  it("should not let a tilde line close a backtick fence", () => {
    const kinds = kindsOf("```", "text", "~~~", "2*3", "```", "外面 4*5");

    expect(kinds[2]).toBe(MarkdownLineKind.FENCED_CODE);
    expect(kinds[3]).toBe(MarkdownLineKind.FENCED_CODE);
    expect(kinds[4]).toBe(MarkdownLineKind.FENCE_MARKER);
    expect(kinds[5]).toBe(MarkdownLineKind.PROSE);
  });

  // Info: (20260812 - Emily) 反向也要成立
  it("should not let a backtick line close a tilde fence", () => {
    const kinds = kindsOf("~~~", "```", "~~~", "外面");

    expect(kinds[1]).toBe(MarkdownLineKind.FENCED_CODE);
    expect(kinds[2]).toBe(MarkdownLineKind.FENCE_MARKER);
    expect(kinds[3]).toBe(MarkdownLineKind.PROSE);
  });

  /**
   * Info: (20260812 - Emily) 教學範例會用四反引號包住三反引號。
   * 不記長度的話內層被當成閉籬,外層剩下的內容就變成內文。
   */
  it("should require the closing fence to be at least as long as the opening", () => {
    const kinds = kindsOf("````", "```mermaid", "2*3", "```", "````", "外面");

    expect(kinds[1]).toBe(MarkdownLineKind.FENCED_CODE);
    expect(kinds[3]).toBe(MarkdownLineKind.FENCED_CODE);
    expect(kinds[4]).toBe(MarkdownLineKind.FENCE_MARKER);
    expect(kinds[5]).toBe(MarkdownLineKind.PROSE);
  });

  it("should treat a longer closing fence as closing", () => {
    const kinds = kindsOf("```", "code", "`````", "外面");

    expect(kinds[2]).toBe(MarkdownLineKind.FENCE_MARKER);
    expect(kinds[3]).toBe(MarkdownLineKind.PROSE);
  });

  // Info: (20260812 - Emily) 閉籬不能帶 info string,那一行仍在圍籬內
  it("should not close on a fence line that carries an info string", () => {
    const kinds = kindsOf("```", "code", "```js", "still code", "```");

    expect(kinds[2]).toBe(MarkdownLineKind.FENCED_CODE);
    expect(kinds[3]).toBe(MarkdownLineKind.FENCED_CODE);
    expect(kinds[4]).toBe(MarkdownLineKind.FENCE_MARKER);
  });

  it("should let an unclosed fence run to the end of the document", () => {
    expect(kindsOf("```", "code", "2*3")).toEqual([
      MarkdownLineKind.FENCE_MARKER,
      MarkdownLineKind.FENCED_CODE,
      MarkdownLineKind.FENCED_CODE,
    ]);
  });

  /**
   * Info: (20260812 - Emily) 4 空白縮排的 code block 原本完全沒被處理,
   * 實測 `    0.6*200*248=1` 會被逸出成 `0.6\*200\*248=1`,
   * 而 markdown 把縮排區塊原樣輸出 —— 兩個反斜線直接印在報告上。
   */
  it("should mark an indented code block that follows a blank line", () => {
    const kinds = kindsOf("說明:", "", "    0.6*200*248=1", "", "後文");

    expect(kinds[2]).toBe(MarkdownLineKind.INDENTED_CODE);
    expect(kinds[4]).toBe(MarkdownLineKind.PROSE);
  });

  it("should keep an indented block open across a blank line", () => {
    const kinds = kindsOf("說明:", "", "    第一行", "", "    第二行");

    expect(kinds[2]).toBe(MarkdownLineKind.INDENTED_CODE);
    expect(kinds[4]).toBe(MarkdownLineKind.INDENTED_CODE);
  });

  it("should accept a tab as indentation", () => {
    expect(kindsOf("說明:", "", "\t2*3")[2]).toBe(
      MarkdownLineKind.INDENTED_CODE,
    );
  });

  /**
   * Info: (20260812 - Emily) 沒有空行隔開的縮排不是 code,是段落的延續行。
   * 判成 code 的代價是那一行的算式失去保護,所以這裡刻意保守。
   */
  it("should not treat a lazy continuation line as code", () => {
    expect(kindsOf("說明:", "    0.6*200 續行")[1]).toBe(
      MarkdownLineKind.PROSE,
    );
  });

  /**
   * Info: (20260812 - Emily) 清單項目底下的縮排內容一律當內文。
   *
   * 這是刻意選的那一邊:誤判成 code 會讓清單裡的算式失去保護(看不見,
   * 而且會進申報數值);誤判成內文只是可能在清單內的 code block 加反斜線
   * (難看,但看得見)。
   */
  it("should not treat indented content under a list item as code", () => {
    expect(kindsOf("- 項目", "", "    2*3")[2]).toBe(MarkdownLineKind.PROSE);
    expect(kindsOf("1. 項目", "", "    2*3")[2]).toBe(MarkdownLineKind.PROSE);
  });

  it("should return one kind per line", () => {
    const lines = ["a", "```", "b", "```", "", "    c"];

    expect(classifyMarkdownLines(lines)).toHaveLength(lines.length);
  });

  it("should classify an empty document as empty", () => {
    expect(classifyMarkdownLines([])).toEqual([]);
  });
});

describe("isMarkdownCodeLine", () => {
  // Info: (20260812 - Emily) 圍籬標記本身也不該被轉換動到
  it("should exclude every kind except prose", () => {
    expect(isMarkdownCodeLine(MarkdownLineKind.PROSE)).toBe(false);
    expect(isMarkdownCodeLine(MarkdownLineKind.FENCE_MARKER)).toBe(true);
    expect(isMarkdownCodeLine(MarkdownLineKind.FENCED_CODE)).toBe(true);
    expect(isMarkdownCodeLine(MarkdownLineKind.INDENTED_CODE)).toBe(true);
  });
});
