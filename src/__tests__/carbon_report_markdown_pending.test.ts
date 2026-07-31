// Info: (20260730 - Tzuhan) 組稿時的空段落收攏。
// Info: (20260730 - Tzuhan) 護的是兩件事:標頭必須逐節輸出(跳段需要落點),但佔位文字不可逐節重複。
import { describe, it, expect } from "@jest/globals";
import { buildSectionHeadingByTitle } from "@/constants/carbon_report_outline";

/**
 * Info: (20260730 - Tzuhan) 複刻 carbon_report_preview 的組稿規則(純函數部分),
 * 讓「連續空段落收成一列」這條規則有測試護住 —— 元件本身含 DOM 相依,不宜在此載入。
 */
function composeReportMarkdown(
  paragraphs: { title: string; content: string }[],
  buildPendingSummary: (count: number) => string,
): string {
  let md = "";
  const flushPending = (pending: number): string =>
    pending === 0 ? "" : `> _${buildPendingSummary(pending)}_\n\n---\n\n`;

  let pending = 0;
  paragraphs.forEach((p) => {
    if (!p.content) {
      pending += 1;
      md += `${buildSectionHeadingByTitle(p.title)}\n\n`;
      return;
    }
    md += flushPending(pending);
    pending = 0;
    md += `${buildSectionHeadingByTitle(p.title)}\n\n${p.content}\n\n---\n\n`;
  });
  return md + flushPending(pending);
}

const summary = (count: number): string => `${count} 節尚未撰寫`;

describe("組稿:未生成段落收攏", () => {
  it("全部未生成時只出現一列摘要,而非逐節重複佔位", () => {
    const paragraphs = Array.from({ length: 33 }, (_, i) => ({
      title: `1.${i} 標題`,
      content: "",
    }));
    const md = composeReportMarkdown(paragraphs, summary);
    expect(md.split("尚未撰寫").length - 1).toBe(1);
    expect(md).toContain("33 節尚未撰寫");
  });

  it("標頭仍逐節輸出(跳段要有落點,大綱骨架不可消失)", () => {
    const paragraphs = Array.from({ length: 5 }, (_, i) => ({
      title: `1.${i} 標題`,
      content: "",
    }));
    const md = composeReportMarkdown(paragraphs, summary);
    paragraphs.forEach((p) => {
      expect(md).toContain(buildSectionHeadingByTitle(p.title));
    });
  });

  it("已寫好的段落原樣輸出,不受收攏影響", () => {
    const md = composeReportMarkdown(
      [
        { title: "1.1 甲", content: "甲的內文" },
        { title: "1.2 乙", content: "乙的內文" },
      ],
      summary,
    );
    expect(md).toContain("甲的內文");
    expect(md).toContain("乙的內文");
    expect(md).not.toContain("尚未撰寫");
  });

  it("空段落夾在中間時分段收攏,計數各自獨立", () => {
    const md = composeReportMarkdown(
      [
        { title: "1.1 甲", content: "" },
        { title: "1.2 乙", content: "" },
        { title: "1.3 丙", content: "丙的內文" },
        { title: "1.4 丁", content: "" },
      ],
      summary,
    );
    expect(md).toContain("2 節尚未撰寫");
    expect(md).toContain("1 節尚未撰寫");
    // Info: (20260730 - Tzuhan) 兩段各一列,共兩列摘要
    expect(md.split("尚未撰寫").length - 1).toBe(2);
  });

  it("結尾的空段落不會被漏掉(最後一批需 flush)", () => {
    const md = composeReportMarkdown(
      [
        { title: "1.1 甲", content: "甲的內文" },
        { title: "1.2 乙", content: "" },
      ],
      summary,
    );
    expect(md).toContain("1 節尚未撰寫");
  });
});
