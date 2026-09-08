import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Info: (20260907 - Emily) 聊天室的 markdown 渲染接線。
 *
 * AI 的回覆本來就帶 markdown(條列的事實清單、GFM 表格的排放源明細、引用章節的標頭),
 * 而聊天泡泡在此之前是 `{message.text}` 純文字 —— 使用者看到的是 `|---|---|` 這些符號。
 * 同一份內容在報告預覽早就渲染過了,只有聊天室沒接上。
 *
 * ## 為什麼是源碼掃描
 *
 * 本專案 jest 的 `testEnvironment` 是 node、沒有 jsdom,渲染不了元件
 * (`salary_delivery_ui_contract.test.ts` 等 UI 契約測試同樣的處置)。
 * 掃描守的是「接線接上了沒有」與「邊界有沒有被悄悄搬動」,
 * 而 markdown 本身的行為由 `MarkdownContent` 自己的測試與
 * `markdown_arithmetic_safety` 等純函式測試守。
 */
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf-8");

/**
 * Info: (20260907 - Emily) 掃描前先剝註解。
 *
 * 這兩支元件的註解**寫了**它們刻意不做的事(「不傳 stripDocumentTitle」、
 * 「日後若要兩側都渲染就換成 MarkdownContent」),而否定型斷言若連註解一起看,
 * 會被那些字串命中 —— 第一版就是這樣紅的。判準是「程式碼有沒有做」,
 * 不是「檔案裡有沒有出現這個字」(同 `db_tests_isolated` 那道掃描的立場)。
 */
const stripComments = (source: string): string =>
  source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const aiBubble = stripComments(
  read("src/components/carbon_chatbot/ai_bubble.tsx"),
);
const userBubble = stripComments(
  read("src/components/carbon_chatbot/user_bubble.tsx"),
);

describe("AI 回覆以既有的 MarkdownContent 渲染", () => {
  it("接上共用元件,而不是自己再寫一份 markdown", () => {
    /*
     * Info: (20260907 - Emily) 釘住「用既有元件」:另寫一份渲染會讓聊天室與報告預覽
     * 對同一段 markdown 產出不同結果,而那正是這個專案這幾週追最多的那種分歧。
     */
    expect(aiBubble).toMatch(
      /import \{ MarkdownContent \} from "@\/components\/common\/markdown_content";/,
    );
    expect(aiBubble).toMatch(
      /<MarkdownContent[\s\S]{0,200}?content=\{message\.text\}/,
    );
  });

  it("泡泡裡不再有裸的 {message.text}(否則等於沒接)", () => {
    const bare = aiBubble.match(/^\s*\{message\.text\}\s*$/m);
    expect(bare).toBeNull();
  });

  it("用 compact 字級與 light 主題(document 是 A4 文件級,給 PDF 用)", () => {
    expect(aiBubble).toMatch(/variant="compact"/);
    expect(aiBubble).toMatch(/theme="light"/);
  });

  it("不傳碳報告專用的三個 opt-in —— 套在聊天回覆上會是靜默的內容遺失", () => {
    /**
     * Info: (20260907 - Emily) `stripDocumentTitle` 剝第一行 H1、
     * `stripEchoedHeadings` 剝「標頭後緊接同文」那一行、`restoreSourceLineBreaks`
     * 改寫段落內的換行 —— 三者都是為報告原文的行結構量過的,聊天回覆沒有那個結構。
     */
    expect(aiBubble).not.toMatch(/stripDocumentTitle/);
    expect(aiBubble).not.toMatch(/stripEchoedHeadings/);
    expect(aiBubble).not.toMatch(/restoreSourceLineBreaks/);
  });
});

describe("使用者那側維持原樣顯示(這是刻意的邊界)", () => {
  it("不渲染 markdown —— 使用者送出什麼就顯示什麼", () => {
    /**
     * Info: (20260907 - Emily) 這一條不是「還沒做」,是產品判準。實測 remark-gfm:
     * `3. 上游運輸 15.4379` 會變編號清單、`3*5=15 而 2*4*6` 的星號會被讀成強調、
     * `# 我的問題` 會變 H1 —— 那是改寫使用者的原話。
     * 日後若決定兩側都渲染,連這一條一起改(`user_bubble` 的註解寫了改法)。
     */
    expect(userBubble).not.toMatch(/MarkdownContent/);
    expect(userBubble).toMatch(/\{message\.text\}/);
  });

  it("但打進去的換行要顯示得出來(whitespace-pre-wrap)", () => {
    expect(userBubble).toMatch(/whitespace-pre-wrap/);
  });
});
