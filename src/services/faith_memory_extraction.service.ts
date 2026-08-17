import { ChatService } from "@/services/chat.service";
import {
  LLM_SYNC_TIMEOUT_MS,
  LLM_TEMPERATURE,
  LlmTaskKeyEnum,
} from "@/constants/llm";
import type { Schema } from "@google/generative-ai";
import { FAITH_MEMORY_CATEGORY } from "@/constants/faith_memory";
import {
  parseExtractedItems,
  type IFaithMemoryItem,
} from "@/lib/faith_memory/items";
import { recordFaithMemoryItems } from "@/services/faith_memory.service";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20260817 - Luphia) 記憶萃取（規範 §4）。
 *
 * LLM 在此只當「視力極佳的字串萃取器」（CLAUDE.md §7）：把一輪對話裡
 * **使用者明示的**偏好轉成結構化條目。它不做判斷、不算數、不推測。
 *
 * 三道確定性護欄，因為 prompt 只是請求、不是保證：
 * 1. `responseSchema` 的封閉 enum 約束分類
 * 2. temperature 0
 * 3. `parseExtractedItems` 逐條檢查——含數字者一律丟棄（金額、稅率、
 *    排放係數的真相在 DB 與規則引擎，記進記憶等於讓 LLM 當事實資料庫，
 *    而且會在數字變動後持續複述舊值）
 */

/**
 * Info: (20260817 - Luphia) 封閉 enum 約束分類（規範 §4.1）：
 * 開放字串會讓分類隨模型心情長出無限多種，而分類是淘汰與呈現的依據。
 */
const EXTRACTION_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: Object.values(FAITH_MEMORY_CATEGORY),
      },
      statement: { type: "string" },
    },
    required: ["category", "statement"],
  },
} as unknown as Schema;

function buildPrompt(userMessage: string, assistantReply: string): string {
  return `
You extract durable user preferences from one turn of a conversation.

Return ONLY preferences the user stated EXPLICITLY about how they want to work
or be answered. If the user stated none, return an empty array — "nothing to
record this turn" is the normal result, not a failure.

Hard rules:
- NEVER record numbers of any kind (amounts, balances, tax rates, factors,
  dates, quantities). Statements containing digits are discarded downstream.
- NEVER record one-off task details; only preferences that stay true next week.
- NEVER infer or guess. No explicit statement means an empty array.
- Each statement: one short sentence, at most 200 characters, in the user's own language.

User message:
"""
${userMessage}
"""

Assistant reply (for context only, do not extract preferences from it):
"""
${assistantReply}
"""
`.trim();
}

/**
 * Info: (20260817 - Luphia) 萃取並寫入。**永不拋錯**。
 *
 * 由呼叫端在回覆送出後執行（規範 §4.2 末條）：記憶寫不成功是背景的事，
 * 不該讓使用者看不到答案，也不該讓已經扣過的那一輪失敗。
 */
export async function extractAndRecordFaithMemory(params: {
  userId: string;
  teamId: string;
  userMessage: string;
  assistantReply: string;
  nowSec: number;
  chatService?: ChatService;
}): Promise<IFaithMemoryItem[]> {
  const { userId, teamId, userMessage, assistantReply, nowSec } = params;

  try {
    const chatService = params.chatService ?? new ChatService();
    const raw = await chatService.generateRaw(
      buildPrompt(userMessage, assistantReply),
      EXTRACTION_SCHEMA,
      {
        // Info: (20260817 - Luphia) 萃取任務一律 temperature 0（CLAUDE.md §7）
        temperature: LLM_TEMPERATURE.EXTRACTION,
        isJson: true,
        taskKey: LlmTaskKeyEnum.FAITH_CHAT,
        timeoutMs: LLM_SYNC_TIMEOUT_MS,
      },
    );

    const items = parseExtractedItems(JSON.parse(raw), nowSec);
    if (items.length === 0) return [];

    await recordFaithMemoryItems({ userId, teamId, items, nowSec });
    return items;
  } catch (error) {
    logger.error("faith memory extraction failed", {
      userId,
      teamId,
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
