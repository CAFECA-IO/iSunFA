import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Info: (20260827 - Emily) 打字只重渲染輸入框(#6718)。
 *
 * 這一條釘的是**架構**,不是行為 —— 而它必須是架構,因為讓打字變慢的不是
 * 某個函式的邏輯錯誤,是 state 住錯地方:`inputValue` 原本住在
 * `use_carbon_chat`(5700 行的 hook),而頁面整棵樹都消費那個 hook,
 * 於是每一個按鍵都重渲染訊息列表 + 報告預覽(實測 59 頁、19 張表)+ 所有 mermaid 圖。
 * 實測伴生「Mermaid rendering failed: Maximum update depth exceeded」。
 *
 * 沒有 jsdom 就量不到 render 次數(這個 repo 的 jest 是 node 環境),
 * 所以判準取「state 的所在地」與「兩端的介面形狀」——
 * 有人把文字搬回 hook、或把 `onInputChange` 那種每鍵回呼加回來,這條會紅。
 */

const ROOT = process.cwd();
const read = (relative: string): string =>
  fs.readFileSync(path.join(ROOT, relative), "utf-8");

const CHAT_INPUT = "src/components/carbon_chatbot/chat_input.tsx";
const HOOK = "src/hooks/use_carbon_chat.ts";
const PAGE = "src/app/user/carbon_chatbot/page.tsx";

describe("聊天輸入的 state 局部性(#6718)", () => {
  it("文字住在 ChatInput 自己的 state 裡", () => {
    const source = read(CHAT_INPUT);
    expect(source).toContain("const [text, setText] = useState<string>");
    expect(source).toContain("value={text}");
    expect(source).toContain("onChange={(e) => setText(e.target.value)}");
  });

  it("ChatInput 不再收「每鍵回呼」與外部的完整文字", () => {
    const source = read(CHAT_INPUT);
    /**
     * Info: (20260827 - Emily) 這兩個名字就是舊架構的形狀:
     * `inputValue` = 文字從外面來(外面就得有 state);
     * `onInputChange` = 每一鍵都往外呼叫(外面就得 setState)。
     * 任一個回來,打字就會再次穿透到頁面層。
     */
    expect(source).not.toContain("onInputChange");
    expect(source).not.toContain("inputValue");
  });

  it("hook 不再持有輸入文字的 state,只留下「下指令」的通道", () => {
    const source = read(HOOK);
    expect(source).not.toContain("const [inputValue, setInputValue]");
    expect(source).toContain("const [inputPrefill, setInputPrefill]");
    // Info: (20260827 - Emily) 預填以 nonce 觸發:值比對分不出「外部要求清空」與「使用者剛好刪空」
    expect(source).toContain("nonce: prev.nonce + 1");
  });

  it("page 傳 prefill 而不是 inputValue/onInputChange", () => {
    const source = read(PAGE);
    expect(source).toContain("prefill={inputPrefill}");
    expect(source).not.toContain("onInputChange=");
    expect(source).not.toContain("inputValue={");
  });

  it("送出把文字上交(不靠外部去讀輸入框)", () => {
    const source = read(CHAT_INPUT);
    // Info: (20260827 - Emily) submit 先取值再清空,清空不等 async 的 onSendMessage 完成
    expect(source).toContain("const outgoing = text;");
    expect(source).toContain("onSendMessage(outgoing)");
    expect(source).toContain("onSendMessage: (text: string) => void");
  });

  it("hook 的送出不再退回輸入框內容(它已經沒有那份 state)", () => {
    const source = read(HOOK);
    /**
     * Info: (20260825 - Emily) 舊的型別硬化是「非字串退回 inputValue」——
     * 那個退路在文字搬走之後不存在了。現在退成空字串,
     * 由「無文字且無就緒附件即不送」的既有 guard 擋掉。
     */
    expect(source).toContain(
      'typeof overrideText === "string" ? overrideText : ""',
    );
  });
});
