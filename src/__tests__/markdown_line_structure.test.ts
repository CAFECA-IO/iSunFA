import { describe, it, expect } from "@jest/globals";
import { restoreLineStructure } from "@/lib/utils/markdown_line_structure";
import { buildCarbonReportHtml } from "@/lib/utils/carbon_report_html";

/**
 * Info: (20260810 - Emily) 盤查報告的敘述逐條編號本來就分行寫,
 * 被 markdown 的軟斷行收成一整片文字牆(最長一段 6,212 字)。
 * 這裡守的是「作者寫了幾行就顯示幾行」。
 */
const NARRATIVE = [
  "3.4 各類排放量計算說明",
  "3.4.1 類別一、直接溫室氣體排放量",
  "(1) 高興昌鋼鐡股份有限公司 總公司",
  "A. 1.1 固定式燃燒",
].join("\n");

describe("restoreLineStructure", () => {
  it("should turn intra-paragraph newlines into hard breaks", () => {
    const out = restoreLineStructure(NARRATIVE).split("\n");
    expect(out[0].endsWith("  ")).toBe(true);
    expect(out[1].endsWith("  ")).toBe(true);
    expect(out[2].endsWith("  ")).toBe(true);
    // Info: (20260810 - Emily) 段落最後一行不需要斷行
    expect(out[3].endsWith("  ")).toBe(false);
  });

  /**
   * Info: (20260810 - Emily) 圍籬與表格列有自己的斷行語意 ——
   * 在 mermaid 定義的行尾加空白不是防護而是污染。
   */
  it("should not touch fenced code or table rows", () => {
    const fenced = [
      "```mermaid",
      "timeline",
      "  1966年01月 : 創立",
      "```",
    ].join("\n");
    expect(restoreLineStructure(fenced)).toBe(fenced);

    const table = [
      "| 項目 | 數值 |",
      "| --- | --- |",
      "| 外購電力 | 21 |",
    ].join("\n");
    expect(restoreLineStructure(table)).toBe(table);
  });

  it("should leave blank lines and paragraph boundaries alone", () => {
    const two = "第一段最後一行\n\n第二段第一行";
    expect(restoreLineStructure(two)).toBe(two);
  });

  it("should be idempotent", () => {
    const once = restoreLineStructure(NARRATIVE);
    expect(restoreLineStructure(once)).toBe(once);
  });
});

/**
 * Info: (20260810 - Emily) buildCarbonReportHtml 回的是**完整 HTML 文件**,
 * 含 <style>。直接把標籤剝掉會把整份 CSS 當成內文,
 * 於是「文字有沒有被改動」這種斷言會拿 CSS 去比對而必然失敗。
 * 要驗的是 body,就只取 body。
 */
const bodyTextOf = (html: string): string => {
  const body = /<body>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
  return body.replace(/<[^>]+>/g, "");
};

describe("buildCarbonReportHtml with restored line structure", () => {
  /**
   * Info: (20260810 - Emily) 端到端:只測 restoreLineStructure 證明字串被加了空白,
   * 沒證明 marked 之後真的斷行。實測整份 UAT 報告 <br> 從 11 個變成 518 個,
   * 而純文字內容一字不差(44,425 = 44,425 字元)。
   */
  it("should render one line per authored line", () => {
    const html = buildCarbonReportHtml(NARRATIVE);
    const body = /<body>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
    expect((body.match(/<br\s*\/?>/g) ?? []).length).toBe(3);
  });

  it("should not change the text content, only where it breaks", () => {
    const html = buildCarbonReportHtml(NARRATIVE);
    expect(bodyTextOf(html).replace(/\s/g, "")).toBe(
      NARRATIVE.replace(/\s/g, ""),
    );
  });

  it("should keep mermaid fences intact", () => {
    const html = buildCarbonReportHtml(
      "內文一行\n\n```mermaid\ntimeline\n  1966年01月 : 創立\n```\n",
    );
    expect(html).toContain('<figure class="chart"><pre class="mermaid">');
    expect(html).toContain("timeline");
  });
});
