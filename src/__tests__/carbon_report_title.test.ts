/**
 * Info: (20260812 - Emily) 報告名稱從內容搬到文件外殼（issue 24）。
 *
 * 這一組的重點不是「能不能剝掉標題」，而是**剝不剝得夠保守** ——
 * 剝過頭就是刪掉使用者的內容，而那是無聲的。
 */
import { describe, it, expect } from "@jest/globals";
import {
  buildDefaultReportName,
  resolveReportName,
  stripLeadingDocumentTitle,
} from "@/lib/utils/carbon_report_title";
import { buildCarbonReportHtml } from "@/lib/utils/carbon_report_html";

describe("stripLeadingDocumentTitle", () => {
  // Info: (20260812 - Emily) 既有草稿的實際形狀（產生端寫的那三行）
  it("should strip the generated document heading and its blank line", () => {
    const draft = ["# 8/12.test1", "", "> _草稿_", "", "---", "", "內文"].join(
      "\n",
    );

    expect(stripLeadingDocumentTitle(draft)).toEqual({
      title: "8/12.test1",
      body: ["> _草稿_", "", "---", "", "內文"].join("\n"),
    });
  });

  /**
   * Info: (20260812 - Emily) 只看第一個非空行。內文中間的 `#` 是使用者的內容,
   * 剝掉它就是靜默刪資料。
   */
  it("should not touch a heading that is not at the top", () => {
    const md = ["前言", "", "# 這是內文裡的標題", "", "後文"].join("\n");

    expect(stripLeadingDocumentTitle(md)).toEqual({ title: "", body: md });
  });

  // Info: (20260812 - Emily) `##` 以下是節標題,不是文件名稱
  it("should only accept a single hash", () => {
    const md = "## 第一章 組織與治理概況\n\n內文";

    expect(stripLeadingDocumentTitle(md)).toEqual({ title: "", body: md });
  });

  it("should ignore leading blank lines before the heading", () => {
    const md = ["", "  ", "# 報告名稱", "", "內文"].join("\n");

    expect(stripLeadingDocumentTitle(md).title).toBe("報告名稱");
    expect(stripLeadingDocumentTitle(md).body).toBe("內文");
  });

  // Info: (20260812 - Emily) 新格式（已經沒有 H1）跑過這一支不得有任何改動
  it("should leave already-migrated content untouched", () => {
    const md = ["> _草稿_", "", "---", "", "## 第一章", "", "內文"].join("\n");

    expect(stripLeadingDocumentTitle(md)).toEqual({ title: "", body: md });
  });

  // Info: (20260812 - Emily) 冪等：剝過的再剝一次不得再吃掉一行
  it("should be idempotent", () => {
    const once = stripLeadingDocumentTitle("# 名稱\n\n> _草稿_\n\n內文").body;

    expect(stripLeadingDocumentTitle(once).body).toBe(once);
  });

  it("should handle an empty document", () => {
    expect(stripLeadingDocumentTitle("")).toEqual({ title: "", body: "" });
    expect(stripLeadingDocumentTitle("\n\n")).toEqual({
      title: "",
      body: "\n\n",
    });
  });

  /**
   * Info: (20260812 - Emily) 圍籬裡的 `#` 是註解或程式碼,不是標題。
   * 這一條守的是「開頭就是一個圍籬」的草稿。
   */
  it("should not strip a hash inside an opening fence", () => {
    const md = ["```bash", "# 這是註解", "```", "", "內文"].join("\n");

    expect(stripLeadingDocumentTitle(md)).toEqual({ title: "", body: md });
  });
});

describe("buildDefaultReportName", () => {
  it("should join company, year and suffix", () => {
    expect(
      buildDefaultReportName({
        accountBookName: "高興昌",
        inventoryYear: "2023",
        suffix: "溫室氣體盤查報告書",
      }),
    ).toBe("高興昌 2023 溫室氣體盤查報告書");
  });

  it("should drop whichever part is missing", () => {
    expect(
      buildDefaultReportName({
        accountBookName: "高興昌",
        suffix: "溫室氣體盤查報告書",
      }),
    ).toBe("高興昌 溫室氣體盤查報告書");
  });

  /**
   * Info: (20260812 - Emily) 兩個都沒有時回空字串而不是只印後綴。
   * 沒有標題是一眼看得出來的缺漏；「溫室氣體盤查報告書」孤零零印在封面上
   * 看起來像填好了，那是更糟的失敗。
   */
  it("should return empty when there is nothing to identify the report", () => {
    expect(buildDefaultReportName({ suffix: "溫室氣體盤查報告書" })).toBe("");
    expect(
      buildDefaultReportName({
        accountBookName: "  ",
        inventoryYear: "",
        suffix: "溫室氣體盤查報告書",
      }),
    ).toBe("");
  });
});

describe("resolveReportName", () => {
  it("should prefer what the user typed", () => {
    expect(
      resolveReportName({
        explicitName: "高興昌 2023 溫室氣體盤查報告書",
        legacyHeading: "8/12.test1",
        fallback: "退路",
      }),
    ).toBe("高興昌 2023 溫室氣體盤查報告書");
  });

  /**
   * Info: (20260812 - Emily) 既有草稿：那行 H1 雖然是會話名，但它是使用者
   * 目前看得到的名稱。突然換掉會讓人以為報告被換了一份 —— 留著並讓他改。
   */
  it("should keep the legacy heading rather than silently renaming", () => {
    expect(
      resolveReportName({ legacyHeading: "8/12.test1", fallback: "退路" }),
    ).toBe("8/12.test1");
  });

  it("should fall back when there is neither", () => {
    expect(resolveReportName({ explicitName: "  ", fallback: "退路" })).toBe(
      "退路",
    );
  });
});

/**
 * Info: (20260812 - Emily) 列印端（本尊）：標題走外殼，內容不再有文件級 H1。
 */
describe("buildCarbonReportHtml 與報告名稱", () => {
  const SHELL = {
    brand: "iSunFA",
    internalDocument: "內部文件",
    systemReport: "系統報告",
    issuedAt: "2026-08-12",
    footerTitle: "頁尾",
    footerText: "(c)",
  };

  // Info: (20260812 - Emily) 既有草稿：內文那行舊標題不得出現在輸出裡
  it("should strip the legacy heading baked into an existing draft", () => {
    const html = buildCarbonReportHtml(
      "# 8/12.test1\n\n> _草稿_\n\n## 第一章\n\n內文\n",
      { ...SHELL, title: "高興昌 2023 溫室氣體盤查報告書" },
    );

    expect(html).not.toContain("8/12.test1");
    expect(html).toContain(
      '<h1 class="doc-title">高興昌 2023 溫室氣體盤查報告書</h1>',
    );
    expect(html).toContain("第一章");
    expect(html).toContain("內文");
  });

  /**
   * Info: (20260812 - Emily) 剝除排在 stripMarkdownComments 之後 ——
   * 內容前面若有 HTML 註解（錨點就是註解），剝除只看第一個非空行，
   * 排錯順序會被那行註解擋住而漏剝。
   */
  it("should still strip when an html comment precedes the heading", () => {
    const html = buildCarbonReportHtml(
      "<!-- carbon-chart:X:start -->\n\n# 8/12.test1\n\n內文\n",
      SHELL,
    );

    expect(html).not.toContain("8/12.test1");
    expect(html).toContain("內文");
  });

  // Info: (20260812 - Emily) 沒有 H1 的新內容不得被動到
  it("should leave content that has no document heading", () => {
    const html = buildCarbonReportHtml("## 第一章\n\n內文\n", SHELL);

    expect(html).toContain("第一章");
    expect(html).toContain("內文");
  });

  // Info: (20260812 - Emily) 外殼沒帶標題時不印 doc-title（留空不猜）
  it("should print no title when the shell has none", () => {
    const html = buildCarbonReportHtml("## 第一章\n\n內文\n", SHELL);

    expect(html).not.toContain('class="doc-title"');
  });
});
