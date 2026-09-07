import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { prepareCarbonMarkdown } from "@/lib/utils/carbon_markdown_prepare";

/**
 * Info: (20260820 - Emily) PR review A2 的回歸測試。
 *
 * 兩個渲染端原本各排一串轉換，靠註解宣稱「順序完全一致」，
 * 而 `stripLeadingDocumentTitle` 兩邊位置不同 —— 同一份輸入產出不同結果。
 * 順序改成寫在 `prepareCarbonMarkdown` 裡之後，「兩端一致」由**呼叫同一支函式**
 * 保證，而這支測試釘住那個順序本身。
 */
describe("prepareCarbonMarkdown 的順序約束", () => {
  /**
   * Info: (20260820 - Emily) review 給的那個輸入。系統刻意把 HTML 註解存在
   * markdown 裡當段落錨點，所以「註解在 H1 之前」不是假想輸入。
   */
  const COMMENT_BEFORE_TITLE =
    "<!-- draft note -->\n# 高興昌 溫室氣體盤查報告書\n\n內文";

  it("註解在 H1 之前時，文件級標題仍然被剝掉", () => {
    const result = prepareCarbonMarkdown(COMMENT_BEFORE_TITLE, {
      stripDocumentTitle: true,
      stripEchoedHeadings: true,
    });

    expect(result.markdown).not.toContain("高興昌 溫室氣體盤查報告書");
    expect(result.markdown).toContain("內文");
  });

  /**
   * Info: (20260820 - Emily) 剝下來的名稱要回傳，不能丟掉 ——
   * 既有草稿的第一行烤著 `# <會話名>`，那是目前唯一的名稱來源。
   */
  it("剝掉的標題以 documentTitle 回傳", () => {
    expect(
      prepareCarbonMarkdown(COMMENT_BEFORE_TITLE, {
        stripDocumentTitle: true,
        stripEchoedHeadings: true,
      }).documentTitle,
    ).toBe("高興昌 溫室氣體盤查報告書");
  });

  it("stripDocumentTitle 為 false 時標題留著，documentTitle 為空", () => {
    const result = prepareCarbonMarkdown(COMMENT_BEFORE_TITLE, {
      stripDocumentTitle: false,
      stripEchoedHeadings: true,
    });

    expect(result.markdown).toContain("# 高興昌 溫室氣體盤查報告書");
    expect(result.documentTitle).toBe("");
  });

  it("沒有前置註解時行為不變（回歸）", () => {
    const result = prepareCarbonMarkdown(
      "# 高興昌 溫室氣體盤查報告書\n\n內文",
      { stripDocumentTitle: true, stripEchoedHeadings: true },
    );

    expect(result.markdown).not.toContain("高興昌");
    expect(result.documentTitle).toBe("高興昌 溫室氣體盤查報告書");
  });

  /**
   * Info: (20260820 - Emily) 剝註解要在剝標題之前，也要在剝同文標頭之前 ——
   * 註解夾在標頭與同文那一行之間時，相鄰判定會被它擋掉。
   */
  it("註解夾在標頭與同文那一行之間時，同文那一行仍被剝掉", () => {
    const result = prepareCarbonMarkdown(
      "### 第五章 溫室氣體減量措施\n<!-- carbon-data-table -->\n第五章 溫室氣體減量措施\n本公司…",
      { stripDocumentTitle: false, stripEchoedHeadings: true },
    );

    expect(
      result.markdown.split("\n").filter((line) => line.includes("第五章"))
        .length,
    ).toBe(1);
  });

  it("程式碼區塊內原樣保留", () => {
    const fenced = "```markdown\n<!-- keep -->\n### 範例\n範例\n```\n";

    expect(
      prepareCarbonMarkdown(fenced, {
        stripDocumentTitle: false,
        stripEchoedHeadings: true,
      }).markdown,
    ).toBe(fenced);
  });

  it("是冪等的（兩端都會各套一次，而匯出端後面還會再套 office 那一支）", () => {
    const once = prepareCarbonMarkdown(COMMENT_BEFORE_TITLE, {
      stripDocumentTitle: true,
      stripEchoedHeadings: true,
    }).markdown;

    expect(
      prepareCarbonMarkdown(once, {
        stripDocumentTitle: true,
        stripEchoedHeadings: true,
      }).markdown,
    ).toBe(once);
  });
});

/**
 * Info: (20260820 - Emily) PR review 第三輪的那一條。
 *
 * `stripEchoedSectionHeadings` 原本在 `MarkdownContent` 裡是**無條件**套用的，
 * 而那支元件有 17 個 tsx 使用端。它的動機只在碳報告成立（組稿端一律由
 * `p.title` 產生標頭），在別處「標頭後緊接一行同文」可能是內容。
 * 同一個檔案往下十行就對 `restoreSourceLineBreaks` 套了 #6644 的原則，
 * 這支新加的當時漏了。
 */
describe("stripEchoedHeadings 是開關而不是無條件套用", () => {
  // Info: (20260820 - Emily) review 給的那個非碳輸入
  const NON_CARBON = "## 注意事項\n注意事項\n\n請攜帶證件";

  it("關閉時同文那一行留著（非碳使用端不該被靜默剝掉內容）", () => {
    const result = prepareCarbonMarkdown(NON_CARBON, {
      stripDocumentTitle: false,
      stripEchoedHeadings: false,
    });

    expect(result.markdown).toBe(NON_CARBON);
  });

  it("開啟時同文那一行被剝掉", () => {
    const result = prepareCarbonMarkdown(NON_CARBON, {
      stripDocumentTitle: false,
      stripEchoedHeadings: true,
    });

    expect(result.markdown).toBe("## 注意事項\n\n請攜帶證件");
  });

  /**
   * Info: (20260820 - Emily) 旗標預設關閉之後，碳報告那端必須主動開 ——
   * 這正是本產品線第六次可能發生的「修正端 ≠ 生效端」。
   * 前五次都是靠回報或 review 才發現，這一條把它變成測試。
   *
   * 用讀原始碼而不是渲染：要守的是**串接有沒有斷**，
   * 而斷點會發生在三個 tsx 之間的 prop 傳遞上，渲染測不到中間那一段。
   */
  describe("碳報告兩端確實有開（修正端 ≠ 生效端的守衛）", () => {
    const read = (relative: string): string =>
      fs.readFileSync(path.join(process.cwd(), relative), "utf-8");

    it("匯出端固定傳 true", () => {
      expect(read("src/lib/utils/carbon_report_html.ts")).toContain(
        "stripEchoedHeadings: true",
      );
    });

    it("預覽端有把旗標打開", () => {
      expect(
        read("src/components/carbon_chatbot/carbon_report_preview.tsx"),
      ).toContain("stripEchoedHeadings");
    });

    it("中間那一層有轉發，不是接住就吞掉", () => {
      const source = read("src/components/pdf_tool/pdf_editor.tsx");

      expect(source).toContain("stripEchoedHeadings?: boolean");
      expect(source).toContain("stripEchoedHeadings={stripEchoedHeadings}");
    });

    it("元件端預設是關的（非碳使用端不必知道這個旗標存在）", () => {
      expect(read("src/components/common/markdown_content.tsx")).toContain(
        "stripEchoedHeadings = false",
      );
    });
  });
});
