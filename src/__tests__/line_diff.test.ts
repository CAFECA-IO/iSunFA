// Info: (20260717 - Emily) 行級 diff 測試(#55 修訂對照優化):LCS 正確性、邊界、護欄

import { describe, it, expect } from "@jest/globals";
import {
  diffLines,
  DiffLineTypeEnum,
  LINE_DIFF_MAX_LINES,
} from "@/lib/line_diff";

describe("diffLines", () => {
  it("should mark only changed lines and keep unchanged lines as SAME", () => {
    const original = "第一行\n第二行\n第三行";
    const revised = "第一行\n第二行(改)\n第三行";
    const diff = diffLines(original, revised);
    expect(diff).not.toBeNull();
    expect(diff).toEqual([
      { type: DiffLineTypeEnum.SAME, text: "第一行" },
      { type: DiffLineTypeEnum.REMOVED, text: "第二行" },
      { type: DiffLineTypeEnum.ADDED, text: "第二行(改)" },
      { type: DiffLineTypeEnum.SAME, text: "第三行" },
    ]);
  });

  it("should handle pure additions and pure removals", () => {
    const added = diffLines("A", "A\nB");
    expect(added).toEqual([
      { type: DiffLineTypeEnum.SAME, text: "A" },
      { type: DiffLineTypeEnum.ADDED, text: "B" },
    ]);
    const removed = diffLines("A\nB", "B");
    expect(removed).toEqual([
      { type: DiffLineTypeEnum.REMOVED, text: "A" },
      { type: DiffLineTypeEnum.SAME, text: "B" },
    ]);
  });

  it("should return identical content as all-SAME", () => {
    const diff = diffLines("相同\n內容", "相同\n內容");
    expect(diff?.every((line) => line.type === DiffLineTypeEnum.SAME)).toBe(
      true,
    );
  });

  it("should reconstruct both sides from the diff (soundness)", () => {
    const original = "甲\n乙\n丙\n丁";
    const revised = "甲\n丙\n戊\n丁";
    const diff = diffLines(original, revised);
    expect(diff).not.toBeNull();
    const left = (diff ?? [])
      .filter((l) => l.type !== DiffLineTypeEnum.ADDED)
      .map((l) => l.text)
      .join("\n");
    const right = (diff ?? [])
      .filter((l) => l.type !== DiffLineTypeEnum.REMOVED)
      .map((l) => l.text)
      .join("\n");
    expect(left).toBe(original);
    expect(right).toBe(revised);
  });

  it("should return null beyond the line-count guard (caller falls back)", () => {
    const huge = new Array(LINE_DIFF_MAX_LINES + 1).fill("行").join("\n");
    expect(diffLines(huge, "短")).toBeNull();
  });
});
