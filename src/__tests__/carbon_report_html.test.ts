import { describe, it, expect } from "@jest/globals";
import {
  annotateTable,
  buildCarbonReportHtml,
  displayWidth,
  stripActiveContent,
} from "@/lib/utils/carbon_report_html";

/**
 * Info: (20260810 - Emily) 版面判定(哪張表轉橫式)需要真的量測,不在這裡測 ——
 * 那部分由 tools/pdf_harness 在真實 Chromium 驗證。
 * 這裡測的是純字串處理:誰是窄欄、誰是類別列、腳本有沒有被拔掉。
 */
describe("displayWidth", () => {
  /**
   * Info: (20260810 - Emily) 全形算兩格。
   * 用 length 的話「員工參與」與「2317」一樣長,文字欄會被判成窄欄、
   * 鎖上 nowrap,表格直接撐爆 —— 這是判準的地基。
   */
  it("should count full-width characters as two units", () => {
    expect(displayWidth("2317")).toBe(4);
    expect(displayWidth("員工參與")).toBe(8);
    expect(displayWidth("")).toBe(0);
  });
});

describe("annotateTable", () => {
  const table = (rows: string[][], head: string[]) =>
    `<table><thead><tr>${head
      .map((cell) => `<th>${cell}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .map(
        (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody></table>`;

  it("should mark score columns narrow and text columns label", () => {
    const html = annotateTable(
      table(
        [["類別二：輸入能源的間接溫室氣體排放量", "2.1 外購電力", "2", "21"]],
        ["排放類別", "排放項目", "A.幅度(數量)", "各項評分加總"],
      ),
    );
    const classes = Array.from(html.matchAll(/<td class="(\w+)"/g)).map(
      (match) => match[1],
    );
    expect(classes).toEqual(["label", "label", "narrow", "narrow"]);
  });

  /**
   * Info: (20260810 - Emily) 只有第一格有內容的列 = 客戶原始報告的類別分隔列
   * (橫跨整張表的那一條)。
   */
  it("should collapse a single-cell row into a full-width group row", () => {
    const html = annotateTable(
      table(
        [
          ["類別二：輸入能源的間接溫室氣體排放量", "", "", ""],
          ["2.1 外購電力", "外購電力", "2", "21"],
        ],
        ["排放類別", "排放項目", "A", "合計"],
      ),
    );
    expect(html).toContain('<tr class="group"><td colspan="4">');
    expect(html.match(/<tr class="group"/g)).toHaveLength(1);
  });

  /**
   * Info: (20260810 - Emily) 類別列不能參與窄欄判定 ——
   * 它第二欄以後都是空字串,會把真正的文字欄拉成「整欄都很短」。
   */
  it("should ignore group rows when deciding narrow columns", () => {
    const html = annotateTable(
      table(
        [
          ["類別三：運輸產生的間接溫室氣體排放", "", ""],
          ["3.1 上游運輸", "產品運輸（海）", "8"],
        ],
        ["排放類別", "排放項目", "合計"],
      ),
    );
    const classes = Array.from(html.matchAll(/<td class="(\w+)"/g)).map(
      (match) => match[1],
    );
    expect(classes.slice(-3)).toEqual(["label", "label", "narrow"]);
  });

  it("should leave a table without rows untouched", () => {
    expect(annotateTable("<table></table>")).toBe("<table></table>");
  });
});

describe("stripActiveContent", () => {
  /**
   * Info: (20260810 - Emily) 這份 HTML 會在**伺服器上的** Chrome 裡被載入,
   * 所以使用者能寫進 markdown 的原始 HTML 不能帶有可執行的東西(SSRF)。
   * service 另外全面阻斷網路請求 —— 兩層都做,任一層失效時另一層仍成立。
   */
  it("should remove scripts, frames and inline handlers", () => {
    const dirty =
      '<p onclick="steal()">x</p><script>fetch("http://internal")</script>' +
      '<iframe src="http://internal"></iframe><a href="javascript:alert(1)">y</a>';
    const clean = stripActiveContent(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("<p>x</p>");
  });
});

describe("buildCarbonReportHtml", () => {
  it("should turn a mermaid fence into a chart container, not a code block", () => {
    const html = buildCarbonReportHtml(
      "# 標題\n\n```mermaid\nflowchart LR\nA-->B\n```\n",
    );
    expect(html).toContain('<figure class="chart"><pre class="mermaid">');
    expect(html).not.toContain("language-mermaid");
  });

  /**
   * Info: (20260810 - Emily) 這三條規則是伺服端列印的全部意義所在:
   * html2canvas 一條都不執行,而它們正是「列不被切一半、跨頁重印表頭」的來源。
   */
  it("should carry the print rules the raster path could never honour", () => {
    const html = buildCarbonReportHtml("內文");
    expect(html).toContain("display: table-header-group");
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("@page landscapePage");
  });

  it("should render gfm tables with column classes", () => {
    const html = buildCarbonReportHtml(
      "| 排放項目 | 合計 |\n| --- | --- |\n| 外購電力 | 21 |\n",
    );
    expect(html).toContain('<td class="label">外購電力</td>');
    expect(html).toContain('<td class="narrow">21</td>');
  });
});
