// Info: (20260826 - Emily) 守門「接線」測試(#6716 round-3 阻擋 2):匯入真的 handler。
//
// Info: (20260826 - Emily) 純函式測試證明「守門會攔」,掃描測試釘住「呼叫還在」——
// Info: (20260826 - Emily) 但 reviewer 的突變(上崗條件改成 length === 0)證明兩者合起來
// Info: (20260826 - Emily) 仍蓋不住「呼叫在、條件被改壞」的組合。本檔照先例
// Info: (20260826 - Emily) invite_route_wiring.test.ts:mock 的邊界落在**外部世界**(LLM SDK),
// Info: (20260826 - Emily) ChatService 與 carbon_reply_gate 用真的 —— 要證明的正是
// Info: (20260826 - Emily) 「LLM 回了一則編數字的回覆時,走完真實路徑的呼叫端拿到什麼」。
//
// Info: (20260826 - Emily) 斷言一律**成對**(review 阻擋 2 原話):只驗「回覆是攔截文案」,
// Info: (20260826 - Emily) 改成「攔了但還是送了」也會過;必須同時驗「LLM 原回覆沒被送出」。

import { describe, it, expect } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { ChatService } from "@/services/chat.service";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

// Info: (20260826 - Emily) 每題測試先設定「LLM 這輪會回什麼」;mock 前綴讓 jest 允許工廠引用
let mockLlmReplyText = "";
// Info: (20260826 - Emily) 守門 X 萃取器那一次呼叫的回覆(預設:無斷言)
let mockExtractorText = JSON.stringify({ claims: [] });

/**
 * Info: (20260826 - Emily) mock 掉的是 SDK(外部世界),不是被測程式:
 * generateContent 回傳可控文字,其餘匯出補齊 chat.service 檔頭 import 需要的名字。
 * ChatService 以明確金鑰建構 → ensureClient 短路,不會碰 systemSettingService/DB。
 * 兩條 LLM 路以**引數形狀**區分(這是 SDK 的真實差異,不是測試的私規):
 * 聊天路傳 { contents },萃取路傳 Part 陣列。
 */
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async (input: unknown) => ({
          response: {
            text: () =>
              Array.isArray(input) ? mockExtractorText : mockLlmReplyText,
            usageMetadata: {
              promptTokenCount: 1,
              candidatesTokenCount: 2,
              totalTokenCount: 3,
            },
            candidates: [],
          },
        }),
      };
    }
  },
  SchemaType: {
    OBJECT: "object",
    STRING: "string",
    ARRAY: "array",
  },
  FinishReason: { MAX_TOKENS: "MAX_TOKENS" },
}));

// Info: (20260826 - Emily) chat.service 頂層 import 會拉進 DB 依賴;金鑰短路後它不被呼叫,mock 只擋載入
jest.mock("@/services/system_setting.service", () => ({
  systemSettingService: { get: async () => undefined },
}));

const OUTLINE_ID = CARBON_REPORT_OUTLINE[0].id;

// Info: (20260826 - Emily) 結構化輸出走 JSON.parse + Zod(reply/readyParagraphId 必填)
const llmJson = (reply: string): string =>
  JSON.stringify({
    reply,
    readyParagraphId: OUTLINE_ID,
    revisionParagraphId: "none",
  });

const facts: IContextFact[] = [
  { label: "全公司總排放量", value: "8332581.1 kgCO2e", source: "帳本總計欄" },
];

const HISTORY = [{ role: "user" as const, text: "我們的排放量是多少?" }];

describe("守門接線:真 ChatService 走完整路徑(LLM 邊界 mock)", () => {
  it("編造排放量 → 攔截文案送出**且**原回覆消失**且**寫入訊號歸零", async () => {
    mockLlmReplyText = llmJson("貴公司年排放約 9999 公噸,屬業界平均。");
    const service = new ChatService("test-key");
    const result = await service.generateCarbonChatbotStructuredResponse(
      HISTORY,
      undefined,
      undefined,
      undefined,
      facts,
    );
    expect(result.reply).toContain("無法溯源");
    expect(result.reply).toContain("9999");
    expect(result.reply).not.toContain("業界平均");
    expect(result.readyParagraphId).toBeNull();
    expect(result.revisionParagraphId).toBeNull();
    expect(result.chartRequest).toBeNull();
  });

  it("帳本空([])守門照上崗:突變回 length === 0 這條會紅在真路徑上", async () => {
    mockLlmReplyText = llmJson("同業平均約 5000 公噸,貴公司應相近。");
    const service = new ChatService("test-key");
    const result = await service.generateCarbonChatbotStructuredResponse(
      HISTORY,
      undefined,
      undefined,
      undefined,
      [],
    );
    expect(result.reply).toContain("無法溯源");
    expect(result.reply).not.toContain("同業平均");
    expect(result.readyParagraphId).toBeNull();
  });

  it("引用事實包原值 → 原回覆原樣送出、寫入訊號保留(誤殺面的成對半邊)", async () => {
    mockLlmReplyText = llmJson("帳本總排放量為 8332581.1 kgCO2e。");
    const service = new ChatService("test-key");
    const result = await service.generateCarbonChatbotStructuredResponse(
      HISTORY,
      undefined,
      undefined,
      undefined,
      facts,
    );
    expect(result.reply).toBe("帳本總排放量為 8332581.1 kgCO2e。");
    expect(result.readyParagraphId).toBe(OUTLINE_ID);
  });

  it("覆述使用者數字做對照 → 過(userTexts 有從 history 接進守門)", async () => {
    mockLlmReplyText = llmJson(
      "您提到的 5000 公噸與帳本的 8332581.1 kgCO2e 不一致。",
    );
    const service = new ChatService("test-key");
    const result = await service.generateCarbonChatbotStructuredResponse(
      [{ role: "user" as const, text: "我們大概排 5000 公噸吧?" }],
      undefined,
      undefined,
      undefined,
      facts,
    );
    expect(result.reply).toContain("5000 公噸與帳本");
    expect(result.reply).not.toContain("無法溯源");
  });

  it("undefined(呼叫端沒帶事實包)→ 守門跳過,原回覆照送(舊呼叫端相容)", async () => {
    mockLlmReplyText = llmJson("貴公司年排放約 9999 公噸。");
    const service = new ChatService("test-key");
    const result = await service.generateCarbonChatbotStructuredResponse(
      HISTORY,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(result.reply).toBe("貴公司年排放約 9999 公噸。");
    expect(result.readyParagraphId).toBe(OUTLINE_ID);
  });

  it("降級路(JSON 解析失敗)同樣過守門:裸文字帶編造數字 → 攔", async () => {
    mockLlmReplyText = "不是 JSON:貴公司排放約 7777 公噸。";
    const service = new ChatService("test-key");
    const result = await service.generateCarbonChatbotStructuredResponse(
      HISTORY,
      undefined,
      undefined,
      undefined,
      facts,
    );
    expect(result.reply).toContain("無法溯源");
    expect(result.reply).toContain("7777");
    expect(result.reply).not.toContain("不是 JSON");
  });

  it("X 主力在真路徑接上:Y 地板構不到的改述,萃取器抓到 → 攔且訊號歸零", async () => {
    // Info: (20260826 - Emily) 6666 與排放單位相距 >10 字,Y 的雙向窗構不到 —— 只有 X 能攔
    mockLlmReplyText = llmJson(
      "全公司總量為 6666,單位標示於本節末尾的公噸 CO2e 說明。",
    );
    mockExtractorText = JSON.stringify({
      claims: [{ value: "6666", unit: "公噸 CO2e" }],
    });
    const service = new ChatService("test-key");
    const result = await service.generateCarbonChatbotStructuredResponse(
      HISTORY,
      undefined,
      undefined,
      undefined,
      facts,
    );
    expect(result.reply).toContain("無法溯源");
    expect(result.reply).toContain("6666");
    expect(result.reply).not.toContain("本節末尾");
    expect(result.readyParagraphId).toBeNull();
    mockExtractorText = JSON.stringify({ claims: [] });
  });

  it("萃取器輸出壞形狀 → 降級留痕放行(Y 已過),不把壞輸出當成「沒有斷言」", async () => {
    mockLlmReplyText = llmJson("帳本總排放量為 8332581.1 kgCO2e,已入帳。");
    mockExtractorText = "不是 JSON";
    const service = new ChatService("test-key");
    const result = await service.generateCarbonChatbotStructuredResponse(
      HISTORY,
      undefined,
      undefined,
      undefined,
      facts,
    );
    expect(result.reply).toBe("帳本總排放量為 8332581.1 kgCO2e,已入帳。");
    expect(result.readyParagraphId).toBe(OUTLINE_ID);
    mockExtractorText = JSON.stringify({ claims: [] });
  });
});
