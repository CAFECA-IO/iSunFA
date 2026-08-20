import { describe, it, expect } from "@jest/globals";
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
      prepareCarbonMarkdown(COMMENT_BEFORE_TITLE, { stripDocumentTitle: true })
        .documentTitle,
    ).toBe("高興昌 溫室氣體盤查報告書");
  });

  it("stripDocumentTitle 為 false 時標題留著，documentTitle 為空", () => {
    const result = prepareCarbonMarkdown(COMMENT_BEFORE_TITLE, {
      stripDocumentTitle: false,
    });

    expect(result.markdown).toContain("# 高興昌 溫室氣體盤查報告書");
    expect(result.documentTitle).toBe("");
  });

  it("沒有前置註解時行為不變（回歸）", () => {
    const result = prepareCarbonMarkdown(
      "# 高興昌 溫室氣體盤查報告書\n\n內文",
      { stripDocumentTitle: true },
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
      { stripDocumentTitle: false },
    );

    expect(
      result.markdown.split("\n").filter((line) => line.includes("第五章"))
        .length,
    ).toBe(1);
  });

  it("程式碼區塊內原樣保留", () => {
    const fenced = "```markdown\n<!-- keep -->\n### 範例\n範例\n```\n";

    expect(
      prepareCarbonMarkdown(fenced, { stripDocumentTitle: false }).markdown,
    ).toBe(fenced);
  });

  it("是冪等的（兩端都會各套一次，而匯出端後面還會再套 office 那一支）", () => {
    const once = prepareCarbonMarkdown(COMMENT_BEFORE_TITLE, {
      stripDocumentTitle: true,
    }).markdown;

    expect(
      prepareCarbonMarkdown(once, { stripDocumentTitle: true }).markdown,
    ).toBe(once);
  });
});
