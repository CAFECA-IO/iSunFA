import { describe, it, expect } from "@jest/globals";
import {
  buildShortTermHistory,
  renderShortTermHistory,
} from "@/lib/faith_memory/short_term";
import { estimateFaithHoldCredits } from "@/lib/faith_billing";
import {
  FAITH_HISTORY_MAX_CHARS,
  FAITH_HISTORY_MAX_TURNS,
  DEFAULT_FAITH_BILLING,
} from "@/constants/llm";

/**
 * Info: (20260817 - Luphia) 任務短期記憶（第一輪 C-2）。
 *
 * 這段內容由**呼叫端自報**（server 讀不到前文：費思不寫 DB，聊天室訊息端對端加密），
 * 所以這支函式的職責是上界而非驗證。要釘死的是兩件事：
 * 1. 截斷永遠丟最舊的，不丟剛剛講的那句
 * 2. 回傳的字元數與實際注入的內容同源——它是預扣估算的依據，
 *    估少了 hold 就不再是成本上界，而 settleSpend 只退不補的前提會直接失效
 */
describe("buildShortTermHistory", () => {
  const turn = (role: "user" | "model", content: string) => ({ role, content });

  it("保留時序（由舊到新）", () => {
    const result = buildShortTermHistory([
      turn("user", "一"),
      turn("model", "二"),
      turn("user", "三"),
    ]);
    expect(result.turns.map((t) => t.content)).toEqual(["一", "二", "三"]);
  });

  /**
   * Info: (20260818 - Luphia) totalChars 必須等於**渲染後**的長度（第三輪 D）。
   *
   * 這個數字唯一的用途是預扣估算，而預扣要蓋住的是真正送進 prompt 的字串：
   * 兩行標頭加上每輪的 `User: ` / `Assistant: ` 前綴。只加總內容長度會少算，
   * 而少算的方向會讓 hold 小於實耗——`settleSpend` 只退不補的前提就破了。
   */
  it("totalChars 等於實際注入字串的長度", () => {
    const result = buildShortTermHistory([
      turn("user", "abc"),
      turn("model", "de"),
    ]);
    expect(result.totalChars).toBe(renderShortTermHistory(result.turns).length);
  });

  // Info: (20260818 - Luphia) 標頭與前綴確實被算進去了：一定大於內容長度之和
  it("totalChars 大於內容長度之和（標頭與前綴要算進去）", () => {
    const result = buildShortTermHistory([
      turn("user", "abc"),
      turn("model", "de"),
    ]);
    const contentOnly = result.turns.reduce(
      (sum, t) => sum + t.content.length,
      0,
    );
    expect(result.totalChars).toBeGreaterThan(contentOnly);
  });

  /**
   * Info: (20260817 - Luphia) 超過輪數上限時丟掉的必須是**最舊的**。
   * 反過來會把使用者剛剛講的那句擠掉，而那正是最需要記得的一句。
   */
  it("超過輪數上限時保留最新的幾輪", () => {
    const raw = Array.from({ length: FAITH_HISTORY_MAX_TURNS + 5 }, (_, i) =>
      turn("user", `m${i}`),
    );
    const result = buildShortTermHistory(raw);

    expect(result.turns).toHaveLength(FAITH_HISTORY_MAX_TURNS);
    expect(result.turns[result.turns.length - 1].content).toBe(
      `m${raw.length - 1}`,
    );
    expect(result.turns[0].content).not.toBe("m0");
  });

  it("超過字元預算即停止，且不超出上界", () => {
    const long = "a".repeat(FAITH_HISTORY_MAX_CHARS);
    const result = buildShortTermHistory([
      turn("user", long),
      turn("model", long),
    ]);

    expect(result.turns).toHaveLength(1);
    /**
     * Info: (20260818 - Luphia) 預算限的是**內容**長度；`totalChars` 是注入長度，
     * 因此會比預算略高（標頭與前綴）。這裡驗的是預算那一側。
     */
    const contentChars = result.turns.reduce(
      (sum, t) => sum + t.content.length,
      0,
    );
    expect(contentChars).toBeLessThanOrEqual(FAITH_HISTORY_MAX_CHARS);
  });

  /**
   * Info: (20260817 - Luphia) 不做部分截斷：半句話送進 prompt，
   * 模型讀到的是一個沒有結尾的句子，比少一輪對話更容易誤解上下文。
   */
  it("不會把一則訊息截一半", () => {
    const result = buildShortTermHistory([
      turn("user", "x".repeat(FAITH_HISTORY_MAX_CHARS + 1)),
    ]);
    expect(result.turns).toHaveLength(0);
    expect(result.totalChars).toBe(0);
  });

  it("略過格式不合法的項目而不是整批放棄", () => {
    const result = buildShortTermHistory([
      { role: "system", content: "ignored" },
      { role: "user", content: 123 },
      turn("user", "  "),
      null,
      "nonsense",
      turn("model", "kept"),
    ]);
    expect(result.turns).toEqual([{ role: "model", content: "kept" }]);
  });

  it("非陣列或空陣列一律回空", () => {
    expect(buildShortTermHistory(undefined).turns).toHaveLength(0);
    expect(buildShortTermHistory([]).totalChars).toBe(0);
    expect(buildShortTermHistory("history").turns).toHaveLength(0);
  });
});

describe("renderShortTermHistory", () => {
  it("沒有前文時回空字串（不污染 prompt）", () => {
    expect(renderShortTermHistory([])).toBe("");
  });

  /**
   * Info: (20260817 - Luphia) 必須標示這是前文，否則模型會把歷史裡的舊問題
   * 當成當前的提問來回答。
   */
  it("標示為前文且區分發話者", () => {
    const rendered = renderShortTermHistory([
      { role: "user", content: "去年折舊怎麼算" },
      { role: "model", content: "直線法" },
    ]);
    expect(rendered).toContain("Previous turns");
    expect(rendered).toContain("User: 去年折舊怎麼算");
    expect(rendered).toContain("Assistant: 直線法");
  });
});

/**
 * Info: (20260817 - Luphia) 注入的前文必須計入預扣（規範 faith_personal_memory.md §5）。
 *
 * 不計入的話，真實 input tokens 會高於估算，hold 不再是成本上界，
 * 而 settleSpend 的「actual ≤ held、只退不補」會收斂成系統默默吸收差額。
 */
describe("estimateFaithHoldCredits with history", () => {
  it("帶前文時預扣不低於不帶前文", () => {
    const without = estimateFaithHoldCredits(
      100,
      false,
      DEFAULT_FAITH_BILLING,
      0,
    );
    const with3000 = estimateFaithHoldCredits(
      100,
      false,
      DEFAULT_FAITH_BILLING,
      3000,
    );
    expect(with3000).toBeGreaterThan(without);
  });

  it("預設值（未傳）與傳 0 相同，既有呼叫端不受影響", () => {
    expect(estimateFaithHoldCredits(100, false, DEFAULT_FAITH_BILLING)).toBe(
      estimateFaithHoldCredits(100, false, DEFAULT_FAITH_BILLING, 0),
    );
  });

  // Info: (20260817 - Luphia) 負數（呼叫端算錯）不該讓預扣變小
  it("負數字元數視為 0", () => {
    expect(
      estimateFaithHoldCredits(100, false, DEFAULT_FAITH_BILLING, -5000),
    ).toBe(estimateFaithHoldCredits(100, false, DEFAULT_FAITH_BILLING, 0));
  });
});
