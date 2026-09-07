/**
 * Info: (20260812 - Emily) 碳報告的 markdown 轉換不得動到桑基圖。
 *
 * ## 為什麼需要這一支
 *
 * 這個 PR 的兩個阻擋項是同一種形狀:**多支轉換互相干擾**。
 * `convertTimelineBlocksToTables` 把 mermaid 圍籬裡的內容搬到 prose,
 * 於是 `escapeArithmeticEmphasis` 對圍籬的保護在搬家之後失效。
 *
 * 桑基圖是同一條管線上**最脆弱的乘客**:
 *
 * - 它整張圖就是一個 ```mermaid 圍籬,任何誤判圍籬的改動都會傷到它
 * - 它的語法是 CSV(`"節點","節點",數值`),與 markdown 表格只差一個字元 ——
 *   `padAllTableHeaders` 認的是 `|`,認錯就會往圖的定義裡插空欄
 * - 它的節點名是中文,而 mermaid 的 sankey lexer 只吃 ASCII;
 *   別名替換發生在渲染層,markdown 層任何改寫都會讓別名對不回原文
 * - 它前後有 `**未畫出的項目…**` 這類說明文字,那些**在圍籬外**,
 *   轉換該作用；一旦圍籬邊界判斷錯,該作用的與不該作用的就會互換
 *
 * 而它目前**沒有任何一條測試守著**。08-12 的 UAT 掃的是符號、目錄與行結構,
 * 沒有一條看圖有沒有還在。下一次改 markdown 管線它會是下一個受害者,
 * 而症狀是「圖不見了」——無聲,跟這個 PR 修的其他問題一樣。
 *
 * ## 這支的不變式
 *
 * 一句話:**圍籬內逐字不動，圍籬外照常轉換。**
 */
import { describe, it, expect } from "@jest/globals";
import {
  buildCarbonReportHtml,
  type ICarbonReportShell,
} from "@/lib/utils/carbon_report_html";
import { escapeArithmeticEmphasis } from "@/lib/utils/markdown_arithmetic_safety";
import { restoreLineStructure } from "@/lib/utils/markdown_line_structure";
import { convertTimelineBlocksToTables } from "@/lib/utils/markdown_timeline_table";
import { padAllTableHeaders } from "@/lib/utils/markdown_table_columns";
import { replaceOfficeSymbolChars } from "@/lib/utils/office_symbol_chars";
import {
  buildChartAnchorEnd,
  buildChartAnchorStart,
  CarbonChartTemplateEnum,
} from "@/constants/carbon_report_charts";

const SHELL: ICarbonReportShell = {
  brand: "iSunFA",
  internalDocument: "內部文件",
  systemReport: "系統報告",
  issuedAt: "2026-08-12",
  footerTitle: "iSunFA 溫室氣體盤查報告書（草稿）",
  footerText: "© 2026 iSunFA.",
};

/**
 * Info: (20260812 - Emily) 與 carbon_report_chart.builder 實際產出的形狀一致:
 * 圍籬 → `sankey-beta` → **一個空行** → CSV 列;圖後面接說明文字。
 * 空行是產生器寫的（`["```mermaid", "sankey-beta", "", ...rows, "```"]`），
 * 所以它屬於「圍籬內逐字不動」的一部分。
 */
const SANKEY_FENCE = [
  "```mermaid",
  "sankey-beta",
  "",
  '"全公司","2023-01",12.34',
  '"2023-01","柴油發票 A-001",8.10',
  '"柴油發票 A-001","固定燃燒源",8.10',
  '"固定燃燒源","範疇一",8.10',
  "```",
].join("\n");

// Info: (20260812 - Emily) 落地的內容是被錨點包起來的（讀取端由 stripMarkdownComments 移除）
const ANCHORED = [
  buildChartAnchorStart(CarbonChartTemplateEnum.EMISSION_SANKEY),
  "",
  SANKEY_FENCE,
  "",
  "**未畫出的項目(NA/NS 或為零)**",
  "",
  "- 外購蒸汽",
  "",
  buildChartAnchorEnd(CarbonChartTemplateEnum.EMISSION_SANKEY),
].join("\n");

describe("每一支轉換單獨跑都不得改動桑基圖", () => {
  const transforms: Array<[string, (markdown: string) => string]> = [
    ["escapeArithmeticEmphasis", escapeArithmeticEmphasis],
    ["restoreLineStructure", restoreLineStructure],
    ["convertTimelineBlocksToTables", convertTimelineBlocksToTables],
    ["padAllTableHeaders", padAllTableHeaders],
    ["replaceOfficeSymbolChars", replaceOfficeSymbolChars],
  ];

  transforms.forEach(([name, transform]) => {
    it(`should leave the sankey fence byte-identical: ${name}`, () => {
      expect(transform(SANKEY_FENCE)).toBe(SANKEY_FENCE);
    });
  });

  /**
   * Info: (20260812 - Emily) CSV 列與 markdown 表格列只差一個字元。
   * `padAllTableHeaders` 若把 `,` 當成欄位邊界,或把圍籬內的列當成表格列,
   * 就會往圖的定義裡插空欄 —— 而那會讓 mermaid 直接畫不出來。
   */
  it("should not mistake sankey CSV rows for a markdown table", () => {
    expect(padAllTableHeaders(ANCHORED)).toBe(ANCHORED);
  });
});

describe("列印端（本尊）", () => {
  const htmlOf = (markdown: string): string =>
    buildCarbonReportHtml(markdown, SHELL);

  const fenceOf = (html: string): string | null => {
    const match = html.match(/<pre class="mermaid">([\s\S]*?)<\/pre>/);
    return match ? match[1] : null;
  };

  it("should render the sankey as a mermaid block", () => {
    const html = htmlOf(`## 3.6 碳流量\n\n${ANCHORED}\n`);

    expect(html).toContain('<figure class="chart"><pre class="mermaid">');
    expect(html).toContain("sankey-beta");
  });

  /**
   * Info: (20260812 - Emily) 逐字比對圍籬內容,含 `sankey-beta` 後的空行。
   * 引號會被 escapeHtml 轉成 `&quot;`（正確 —— 那是注入面,而 mermaid 讀的是
   * DOM 的 textContent,拿到的仍是引號本身）。
   */
  it("should keep the fence body verbatim, blank line included", () => {
    const body = fenceOf(htmlOf(`${ANCHORED}\n`));

    expect(body).toBe(
      [
        "sankey-beta",
        "",
        "&quot;全公司&quot;,&quot;2023-01&quot;,12.34",
        "&quot;2023-01&quot;,&quot;柴油發票 A-001&quot;,8.10",
        "&quot;柴油發票 A-001&quot;,&quot;固定燃燒源&quot;,8.10",
        "&quot;固定燃燒源&quot;,&quot;範疇一&quot;,8.10",
        "",
      ].join("\n"),
    );
  });

  // Info: (20260812 - Emily) 圍籬外的說明文字照常轉換（強調語法要生效）
  it("should still render the note outside the fence", () => {
    const html = htmlOf(`${ANCHORED}\n`);

    expect(html).toContain("<strong>未畫出的項目(NA/NS 或為零)</strong>");
    expect(html).toContain("外購蒸汽");
  });

  /**
   * Info: (20260812 - Emily) 這一條是兩個阻擋項的形狀:timeline 會被搬成表格,
   * 而搬家不得波及同一份文件裡的其他圍籬。兩種順序都要成立 ——
   * 圍籬的邊界判斷若失步,「誰在圍籬內」會從某一行之後全部相反。
   */
  it("should survive a timeline block before it", () => {
    const html = htmlOf(
      `\`\`\`mermaid\ntimeline\n  1966年01月 : 創立\n\`\`\`\n\n${ANCHORED}\n`,
    );

    expect(html).toContain("sankey-beta");
    expect(fenceOf(html)).toContain("&quot;全公司&quot;");
  });

  it("should survive a timeline block after it", () => {
    const html = htmlOf(
      `${ANCHORED}\n\n\`\`\`mermaid\ntimeline\n  1966年01月 : 創立\n\`\`\`\n`,
    );

    expect(html).toContain("sankey-beta");
    // Info: (20260812 - Emily) timeline 變表格、sankey 留在圖裡 —— 各一個
    expect(html.match(/<pre class="mermaid">/g)).toHaveLength(1);
    expect(html).toContain("<table");
  });

  /**
   * Info: (20260812 - Emily) 同一份文件裡有窄表頭的表格時,補欄只能動那張表。
   * 這是「多支轉換互相干擾」最可能重演的組合。
   */
  it("should not be touched while a narrow table next to it is widened", () => {
    const html = htmlOf(
      [
        ANCHORED,
        "",
        "| 項目 | 排放量 |",
        "| --- | --- |",
        "| 甲類 | 1.2 | 備註內容 |",
        "",
      ].join("\n"),
    );

    expect(fenceOf(html)).toContain(
      "&quot;固定燃燒源&quot;,&quot;範疇一&quot;",
    );
    // Info: (20260812 - Emily) 隔壁那張表確實被補欄救回來了
    expect(html).toContain("備註內容");
  });

  /**
   * Info: (20260812 - Emily) 節點名含算式時不得被逸出。
   * 圍籬內加反斜線是污染不是保護 —— 而 sankey 的別名替換是拿原文字串去比對,
   * 多一個反斜線就對不回來,表現是整張圖畫不出來。
   */
  it("should not escape arithmetic inside node names", () => {
    const withMath = [
      "```mermaid",
      "sankey-beta",
      "",
      '"產線 2*3","範疇一",4.5',
      "```",
    ].join("\n");
    const html = htmlOf(`${withMath}\n`);

    expect(html).toContain("2*3");
    expect(html).not.toContain("2\\*3");
  });
});
