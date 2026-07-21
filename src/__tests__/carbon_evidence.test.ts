// Info: (20260720 - Emily) #54 證據鏈 fence 測試:建構/解析對偶、冪等護欄、格式不符不猜

import { describe, it, expect } from "@jest/globals";
import {
  buildEvidenceChainBlock,
  parseEvidenceFence,
  hasEvidenceChainBlock,
  CARBON_EVIDENCE_FENCE_LANG,
} from "@/constants/carbon_evidence";

describe("carbon evidence fence", () => {
  it("should round-trip: parse(build(id)) === id", () => {
    const block = buildEvidenceChainBlock("book-995d6805");
    expect(block).toContain(`\`\`\`${CARBON_EVIDENCE_FENCE_LANG}`);
    // Info: (20260720 - Emily) fence 內文只有資料位址,無任何數字快照
    const inner = block
      .split("\n")
      .filter((l) => !l.startsWith("```"))
      .join("\n");
    expect(parseEvidenceFence(inner)).toBe("book-995d6805");
  });

  it("should be idempotent via hasEvidenceChainBlock guard", () => {
    const content = `敘述。\n\n${buildEvidenceChainBlock("book-1")}`;
    expect(hasEvidenceChainBlock(content)).toBe(true);
    expect(hasEvidenceChainBlock("敘述。")).toBe(false);
  });

  it("should return null for malformed fences (render as plain code, never guess)", () => {
    expect(parseEvidenceFence("")).toBeNull();
    expect(parseEvidenceFence("someKey: value")).toBeNull();
    expect(parseEvidenceFence("accountBookId:")).toBeNull();
    expect(parseEvidenceFence(`accountBookId: ${"x".repeat(101)}`)).toBeNull();
  });
});
