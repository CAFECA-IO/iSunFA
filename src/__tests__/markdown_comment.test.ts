// Info: (20260730 - Tzuhan) 顯示層註解剝除:護的是「錨點要隱藏,但使用者的程式碼範例不可被改寫」。
// Info: (20260730 - Tzuhan) 這個模組是從 markdown_content.tsx 的行內 regex 抽出來的 —— 那版會吃掉 fence 內的註解。
import { describe, it, expect } from "@jest/globals";
import { stripMarkdownComments } from "@/lib/utils/markdown_comment";

describe("stripMarkdownComments", () => {
  it("移除段落錨點註解", () => {
    const md =
      "敘述\n\n<!-- carbon-data-table:start -->\n| a |\n<!-- carbon-data-table:end -->";
    const out = stripMarkdownComments(md);
    expect(out).not.toContain("carbon-data-table");
    expect(out).toContain("| a |");
    expect(out).toContain("敘述");
  });

  it("程式碼區塊內的註解原樣保留(那是內容,不是錨點)", () => {
    const md = [
      "說明:",
      "```html",
      "<div>",
      "  <!-- 這行是教學內容 -->",
      "</div>",
      "```",
    ].join("\n");
    expect(stripMarkdownComments(md)).toContain("這行是教學內容");
  });

  it("~~~ 圍欄同樣視為程式碼區塊", () => {
    const md = ["~~~html", "<!-- 保留我 -->", "~~~"].join("\n");
    expect(stripMarkdownComments(md)).toContain("保留我");
  });

  it("跨行註解整段移除,註解前後的內容保留", () => {
    const md = ["前段", "<!-- 第一行", "第二行", "第三行 -->", "後段"].join(
      "\n",
    );
    const out = stripMarkdownComments(md);
    expect(out).toContain("前段");
    expect(out).toContain("後段");
    expect(out).not.toContain("第二行");
  });

  it("同一行內註解與正文並存時只移除註解", () => {
    expect(stripMarkdownComments("排放量 <!-- 錨點 --> 為 100")).toBe(
      "排放量  為 100",
    );
  });

  it("跨行註解結束後同行的內容不遺失", () => {
    const md = ["<!-- 開始", "中間 --> 尾巴內容"].join("\n");
    expect(stripMarkdownComments(md)).toContain("尾巴內容");
  });

  it("段落間的空行保留(不可壓縮版面)", () => {
    const md = "第一段\n\n第二段";
    expect(stripMarkdownComments(md)).toBe(md);
  });

  it("整行只有註解時不留下空行殘渣", () => {
    const md = "甲\n<!-- 只有註解 -->\n乙";
    expect(stripMarkdownComments(md)).toBe("甲\n乙");
  });

  it("沒有註解時原文完全不動", () => {
    const md = "# 標題\n\n內文\n\n```ts\nconst a = 1;\n```";
    expect(stripMarkdownComments(md)).toBe(md);
  });
});
