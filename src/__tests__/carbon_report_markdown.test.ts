// Info: (20260716 - Tzuhan) #50 報告 Markdown 保留式切分 + 標題對齊測試:貼上內容 round-trip 零遺失

import { describe, it, expect } from "@jest/globals";
import {
  splitReportMarkdownSections,
  alignReportSections,
  patchMarkdownSection,
} from "@/hooks/use_carbon_chat.helpers";

const TITLES = ["1.1 組織概況", "1.2 盤查邊界", "3.2 範疇二排放"];

// Info: (20260716 - Tzuhan) 模擬組稿格式:# 標題 + > _狀態_ + --- + 各段 ### 標題/內文/---
const compose = (bodies: (string | null)[]): string => {
  let md = `# 測試報告\n\n> _報告狀態:草稿_\n\n---\n\n`;
  TITLES.forEach((title, i) => {
    const body = bodies[i] ?? "> _本段尚未生成_";
    md += `### ${title}\n\n${body}\n\n---\n\n`;
  });
  return md;
};

describe("splitReportMarkdownSections", () => {
  it("should split by ### headings and strip trailing dividers", () => {
    const { preamble, sections } = splitReportMarkdownSections(
      compose(["內文一", "內文二", "內文三"]),
    );
    expect(preamble).toContain("# 測試報告");
    expect(sections.map((s) => s.heading)).toEqual(TITLES);
    expect(sections.map((s) => s.body)).toEqual(["內文一", "內文二", "內文三"]);
  });

  it("should not split on ### inside code fences", () => {
    const md = `### ${TITLES[0]}\n\n\`\`\`\n### 這不是標題\n\`\`\`\n說明文字`;
    const { sections } = splitReportMarkdownSections(md);
    expect(sections).toHaveLength(1);
    expect(sections[0].body).toContain("### 這不是標題");
    expect(sections[0].body).toContain("說明文字");
  });

  it("should keep ##/#### lines inside the owning section", () => {
    const md = `### ${TITLES[0]}\n\n#### 子節\n內容\n\n## 貼上的大標`;
    const { sections } = splitReportMarkdownSections(md);
    expect(sections).toHaveLength(1);
    expect(sections[0].body).toContain("#### 子節");
    expect(sections[0].body).toContain("## 貼上的大標");
  });
});

describe("alignReportSections (zero-loss round-trip)", () => {
  it("should align by heading and survive an inserted unknown heading (old code discarded ALL edits)", () => {
    const md = compose(["內文一(已改)", "內文二", "內文三"]).replace(
      "內文二",
      `內文二\n\n---\n\n### 我自己貼的段落\n\n自訂內容`,
    );
    const aligned = alignReportSections(
      TITLES,
      splitReportMarkdownSections(md),
    );

    expect(aligned.get(0)).toBe("內文一(已改)");
    // Info: (20260716 - Tzuhan) 未知標題原文併入前一相符段落 → 零丟棄
    expect(aligned.get(1)).toContain("內文二");
    expect(aligned.get(1)).toContain("### 我自己貼的段落");
    expect(aligned.get(1)).toContain("自訂內容");
    expect(aligned.get(2)).toBe("內文三");
  });

  it("should attach pasted preamble and leading orphans to the first matched section", () => {
    const md = `貼在最前面的自由文字\n\n### 不在大綱的標題\n\n孤兒內容\n\n${compose(["內文一", null, null])}`;
    const aligned = alignReportSections(
      TITLES,
      splitReportMarkdownSections(md),
    );

    expect(aligned.get(0)).toContain("貼在最前面的自由文字");
    expect(aligned.get(0)).toContain("### 不在大綱的標題");
    expect(aligned.get(0)).toContain("內文一");
  });

  it("should exclude composed header lines from user preamble", () => {
    const aligned = alignReportSections(
      TITLES,
      splitReportMarkdownSections(compose(["內文一", "內文二", "內文三"])),
    );
    // Info: (20260716 - Tzuhan) 組稿標頭(# 標題/> _狀態_/---)非使用者內容,不得混入段落
    expect(aligned.get(0)).toBe("內文一");
  });

  it("should omit deleted paragraphs from the map (caller keeps original content)", () => {
    const md = compose(["內文一", "內文二", "內文三"]).replace(
      `### ${TITLES[2]}`,
      "### ",
    );
    const aligned = alignReportSections(
      TITLES,
      splitReportMarkdownSections(md),
    );
    expect(aligned.has(2)).toBe(false);
    expect(aligned.get(0)).toBe("內文一");
  });

  it("should keep placeholder quotes intact for untouched empty paragraphs", () => {
    const aligned = alignReportSections(
      TITLES,
      splitReportMarkdownSections(compose(["內文一", null, null])),
    );
    // Info: (20260716 - Tzuhan) 佔位引言原樣回傳,由 hook 判定「未觸碰 → 維持未生成」
    expect(aligned.get(1)).toBe("> _本段尚未生成_");
  });
});

describe("patchMarkdownSection (rawMarkdown authoritative source)", () => {
  const DOC = `# 我的自訂報告

自訂前言,不可被動到。

### 1.1 組織概況

原本的內文。

---

### 我的自訂章節

自訂內容也不可被動到。
`;

  it("should replace only the target section body and keep the document structure", () => {
    const patched = patchMarkdownSection(
      DOC,
      "1.1 組織概況",
      "AI 更新後的內文。",
    );
    // Info: (20260716 - Tzuhan) 使用者結構零改動:標頭/前言/自訂章節原樣
    expect(patched).toContain("# 我的自訂報告");
    expect(patched).toContain("自訂前言,不可被動到。");
    expect(patched).toContain("### 我的自訂章節");
    expect(patched).toContain("自訂內容也不可被動到。");
    expect(patched).toContain("AI 更新後的內文。");
    expect(patched).not.toContain("原本的內文。");
    // Info: (20260716 - Tzuhan) 段落分隔線保留
    expect(patched).toContain("---");
  });

  it("should append at the end when the heading does not exist", () => {
    const patched = patchMarkdownSection(DOC, "3.2 範疇二排放", "新段落內文。");
    expect(patched).toContain("### 3.2 範疇二排放");
    expect(patched.indexOf("### 3.2 範疇二排放")).toBeGreaterThan(
      patched.indexOf("### 我的自訂章節"),
    );
    expect(patched).toContain("原本的內文。");
  });

  it("should not treat ### inside code fences as section boundaries", () => {
    const doc = "### 1.1 組織概況\n\n```\n### 假標題\n```\n內文尾。\n";
    const patched = patchMarkdownSection(doc, "1.1 組織概況", "新內文。");
    expect(patched).toContain("新內文。");
    expect(patched).not.toContain("內文尾。");
  });
});
