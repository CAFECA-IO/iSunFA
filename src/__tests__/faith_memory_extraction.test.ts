import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { extractAndRecordFaithMemory } from "@/services/faith_memory_extraction.service";
import {
  isFaithMemoryEnabled,
  recordFaithMemoryItems,
} from "@/services/faith_memory.service";
import type { ChatService } from "@/services/chat.service";
import { FAITH_MEMORY_CATEGORY } from "@/constants/faith_memory";

/**
 * Info: (20260818 - Luphia) 萃取的方案 gate 必須擋在 LLM 呼叫之前（第三輪 A-3）。
 *
 * 原本先萃取、再由 `recordFaithMemoryItems` 判方案，於是免費團隊也照跑這次呼叫：
 * 把使用者的對話送去做偏好萃取，然後把結果丟掉。ToS §3.7 明載免費版
 * 「不提供長期記憶與回饋學習機制，故不保留您的偏好紀錄」——那是一次
 * **無對價、無條款依據的個資處理**，而且送給了第三方 LLM。
 *
 * 這支測試存在的理由：`faith_chat_service.test.ts` 把整個萃取服務 mock 掉了，
 * 因此那裡的綠燈只證明「有沒有被呼叫」，不證明「被呼叫之後做了什麼」。
 */

jest.mock("@/services/faith_memory.service", () => ({
  isFaithMemoryEnabled: jest.fn(async () => true),
  recordFaithMemoryItems: jest.fn(async () => undefined),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;
const NOW_SEC = 1_760_000_000;

function makeChatStub(payload: unknown) {
  return {
    generateRaw: jest.fn(async () => JSON.stringify(payload)),
  } as unknown as ChatService;
}

const run = (chatService: ChatService) =>
  extractAndRecordFaithMemory({
    userId: "user-1",
    teamId: "team-1",
    userMessage: "以後回答請簡短",
    assistantReply: "好的",
    nowSec: NOW_SEC,
    chatService,
  });

beforeEach(() => {
  jest.clearAllMocks();
  asMock(isFaithMemoryEnabled).mockResolvedValue(true);
});

describe("extractAndRecordFaithMemory", () => {
  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：免費版**連呼叫都不該發生**。
   * 「呼叫了但把結果丟掉」在成本與個資兩方面都不算擋下來。
   */
  it("免費版不呼叫 LLM，也不寫入", async () => {
    asMock(isFaithMemoryEnabled).mockResolvedValue(false);
    const chatService = makeChatStub([]);

    const items = await run(chatService);

    expect(asMock(chatService.generateRaw)).not.toHaveBeenCalled();
    expect(recordFaithMemoryItems).not.toHaveBeenCalled();
    expect(items).toEqual([]);
  });

  it("付費版才呼叫 LLM 並寫入", async () => {
    const chatService = makeChatStub([
      {
        category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE,
        statement: "回答請簡短",
      },
    ]);

    const items = await run(chatService);

    expect(asMock(chatService.generateRaw)).toHaveBeenCalledTimes(1);
    expect(recordFaithMemoryItems).toHaveBeenCalled();
    expect(items).toHaveLength(1);
  });

  // Info: (20260818 - Luphia) 萃取要計費，因此輸出必須有上界，否則預扣估不出來
  it("以 maxOutputTokens 封住萃取的輸出", async () => {
    const chatService = makeChatStub([]);

    await run(chatService);

    const options = asMock(chatService.generateRaw).mock.calls[0][2];
    expect(options.maxOutputTokens).toBeGreaterThan(0);
    // Info: (20260818 - Luphia) 萃取任務一律 temperature 0（CLAUDE.md §7）
    expect(options.temperature).toBe(0);
  });

  /**
   * Info: (20260818 - Luphia) 「這輪沒東西可記」是正常結果，不是失敗——
   * 而且不該為了一個空陣列去寫一次資料庫。
   */
  it("沒有可記的偏好時不寫入", async () => {
    const items = await run(makeChatStub([]));

    expect(recordFaithMemoryItems).not.toHaveBeenCalled();
    expect(items).toEqual([]);
  });

  /**
   * Info: (20260818 - Luphia) 萃取失敗永不拋錯（規範 §4.2 末條）：
   * 「記憶沒寫成功」不該讓使用者看不到答案，也不該讓已經結算的那一輪失敗。
   */
  it("LLM 失敗時安靜地回空陣列", async () => {
    const chatService = {
      generateRaw: jest.fn(async () => {
        throw new Error("llm down");
      }),
    } as unknown as ChatService;

    await expect(run(chatService)).resolves.toEqual([]);
  });

  it("回傳不是 JSON 時同樣不拋錯", async () => {
    const chatService = {
      generateRaw: jest.fn(async () => "not json"),
    } as unknown as ChatService;

    await expect(run(chatService)).resolves.toEqual([]);
  });
});
