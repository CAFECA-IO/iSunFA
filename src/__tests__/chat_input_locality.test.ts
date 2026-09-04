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

  /**
   * Info: (20260831 - Emily) 送不出去要把字還回去(review 中-1)。
   *
   * 這是 #6718 自己引入的迴歸:清空搬進元件、而清空在 `onSendMessage` 之前,
   * 於是金鑰那兩條早退(不支援裝置 / 取消生物辨識)之後,使用者打的字沒了。
   * develop 上舊的 `setInputValue("")` 在所有早退之後,所以本來有這個保護。
   *
   * 沒有 jsdom,所以釘的是「還原呼叫落在 catch 區塊裡、且兩條路徑都有」——
   * 掃描只回答「條文在不在」,實際體驗由人工驗收那份清單負責。
   */
  it("金鑰失敗的兩條早退都把文字還回輸入框", () => {
    const source = read(HOOK);
    const start = source.indexOf("masterKey = await ensureMasterKeyCached();");
    const end = source.indexOf("const attachmentsMeta", start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const keyBlock = source.slice(start, end);
    // Info: (20260831 - Emily) `[,)]` 而不是 `\)`:還原帶第二個參數("restore"),
    // 寫死右括號會在加參數的那一刻紅,而那不是缺陷(review 第二輪點出的)
    const restores = keyBlock.match(/commandInput\(outgoingText[,)]/g) ?? [];
    expect(restores).toHaveLength(2);
    // Info: (20260831 - Emily) 兩處都必須是「歸還」而不是「指令」
    expect(
      keyBlock.match(/commandInput\(outgoingText, "restore"\)/g),
    ).toHaveLength(2);
    expect(keyBlock).toContain("device_unsupported");
    expect(keyBlock).toContain("system_error");
  });

  it("組字中的 Enter 不送出(照同類元件的寫法)", () => {
    const source = read(CHAT_INPUT);
    expect(source).toContain("e.nativeEvent.isComposing");
    /**
     * Info: (20260831 - Emily) 判準是**同類**而不是多數(review 第二輪的更正)。
     *
     * 全 repo 有 30 個檔判 `key === "Enter"`,只有 4 個擋組字 ——
     * 所以「大家都擋了、這裡是唯一例外」是錯的說法(我第一版的註解照抄了
     * 那個錯,連同元件那邊一起改掉;只改一處正是低-1 的形狀)。
     * 真正同類的是「自由輸入的中文長句、Enter 即送出」,本 repo 兩個,
     * 兩個都擋了 —— 這條就釘那兩個。
     */
    expect(read("src/components/chat/chat_input.tsx")).toContain("isComposing");
    expect(
      read("src/components/ai_consultation_room/comment_post_input.tsx"),
    ).toContain("isComposing");
  });

  /**
   * Info: (20260831 - Emily) 歸還不得搶掉使用者手上打的字(review 第二輪)。
   *
   * 金鑰那段時間輸入框沒有被 disabled,所以「還原」與「使用者正在打的字」
   * 會撞在一起。分辨的資訊只有元件有(框裡現在有沒有字),
   * 所以判斷放在元件、`mode` 只負責帶語意。
   */
  it("prefill 分「指令」與「歸還」,歸還在框裡有字時不覆寫", () => {
    const hook = read(HOOK);
    expect(hook).toContain('mode: "set" | "restore"');
    expect(hook).toContain('mode: "set" | "restore" = "set"');

    const source = read(CHAT_INPUT);
    // Info: (20260831 - Emily) functional updater:不把 text 加進 deps(那會讓每次打字都重跑 effect)
    expect(source).toContain("setText((current) =>");
    expect(source).toContain('prefill.mode === "restore"');
    expect(source).toContain("current.trim().length > 0");
    expect(source).not.toContain("}, [prefill, text]);");
  });

  /**
   * Info: (20260903 - Luphia) 送出成功**不清空**輸入框(review 阻-1/阻-2)。
   *
   * 原本成功路徑有一個無條件的 `commandInput("")`,而它服務的唯一路徑
   *(後續建議按鈕,繞過元件 submit)框裡放的是使用者自己的草稿 ——
   * 清掉它就是刪使用者的東西,而且不需要任何時間窗:
   * 打半句話 → 點一下 chip → 草稿消失。註解裡另外那條「跳段後自動送出」不存在。
   *
   * 判準用**精確筆數**而不是門檻或區間掃描:
   * - 門檻(`>= 1`)擋不住「又多加了一處」
   * - 區間掃描(`slice(start, start + N)`)對「附近加註解」是脆的
   *   (本 repo 的 `carbon_import_pause` 就因此被推出窗外過)
   * 剩下的那一處是切房(`switchSession`)—— 那是真正的指令。
   * **要新增第二處,請先說得出它為什麼是指令而不是在刪使用者的字。**
   */
  it("set 模式的清空只剩切房一處(送出成功不清)", () => {
    const hook = read(HOOK);
    const statements = hook.match(/^ {6}commandInput\(""\);$/gm) ?? [];
    expect(statements).toHaveLength(1);
    // Info: (20260903 - Luphia) 反面:歸還那兩處必須帶 mode,不能退化成 set
    const restores =
      hook.match(/commandInput\(outgoingText, "restore"\)/g) ?? [];
    expect(restores).toHaveLength(2);
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
