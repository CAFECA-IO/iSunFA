import {
  FAITH_HISTORY_MAX_CHARS,
  FAITH_HISTORY_MAX_TURNS,
} from "@/constants/llm";

/**
 * Info: (20260817 - Luphia) 費思的「任務短期記憶」（條款 §3.7、方案頁：所有方案皆具備）。
 *
 * 為什麼歷史由 client 傳上來，而不是 server 自己查：
 * 費思的對話**不寫入資料庫**（`runFaithBilledChat` 全程沒有任何 chatroom 寫入），
 * 而 `ChatroomMessage.encryptedContent` 是 ECIES 端對端加密，server 手上只有密文。
 * 也就是說，server 沒有任何管道讀得到這段對話的前文——持有明文的只有瀏覽器。
 * 這也正好對上條款寫的「任務短期記憶**不予儲存**、任務結束即不再保留」：
 * 它活在使用者的分頁裡，關掉就沒了。
 *
 * 代價是這段內容是**呼叫端自報**的，因此這支函式的職責是「上界」而非「驗證」：
 * 截到固定的輪數與字元數，讓它對 prompt 長度與扣點的影響有一個算得出來的天花板。
 * 內容本身不需要信任——那是使用者自己說過的話，他本來就能在 message 裡打任何東西。
 */

export type FaithHistoryRole = "user" | "model";

export interface IFaithHistoryTurn {
  role: FaithHistoryRole;
  content: string;
}

export interface IShortTermHistory {
  turns: IFaithHistoryTurn[];
  /**
   * Info: (20260817 - Luphia) 截斷後的總字元數，供預扣估算使用。
   * 由這裡回傳而不是讓呼叫端自己數：估算與實際注入的必須是同一份內容，
   * 分開算就會出現「估的是 A、送的是 B」，而 hold 一旦小於實耗，
   * `settleSpend` 的「只退不補」前提就破了（設計書 §5.3）。
   */
  totalChars: number;
}

const EMPTY: IShortTermHistory = { turns: [], totalChars: 0 };

function isRole(value: unknown): value is FaithHistoryRole {
  return value === "user" || value === "model";
}

/**
 * Info: (20260817 - Luphia) 取最近幾輪、且總長不超過預算的對話。
 *
 * 由**新到舊**取，取滿為止再反轉回時序：截斷時該丟掉的是最舊的內容。
 * 反過來（由舊到新取滿）會讓使用者剛剛講的那句話被擠掉，而那正是最需要記得的一句。
 */
export function buildShortTermHistory(raw: unknown): IShortTermHistory {
  if (!Array.isArray(raw) || raw.length === 0) return EMPTY;

  const picked: IFaithHistoryTurn[] = [];
  let totalChars = 0;

  for (let i = raw.length - 1; i >= 0; i -= 1) {
    if (picked.length >= FAITH_HISTORY_MAX_TURNS) break;

    const entry = raw[i];
    if (!entry || typeof entry !== "object") continue;

    const { role, content } = entry as { role?: unknown; content?: unknown };
    if (!isRole(role) || typeof content !== "string") continue;

    const trimmed = content.trim();
    if (!trimmed) continue;

    /**
     * Info: (20260817 - Luphia) 超出預算就停，不做部分截斷。
     * 把一句話砍一半送進 prompt，模型讀到的是一個沒有結尾的句子，
     * 那比少一輪對話更容易讓它誤解上下文。
     */
    if (totalChars + trimmed.length > FAITH_HISTORY_MAX_CHARS) break;

    picked.push({ role, content: trimmed });
    totalChars += trimmed.length;
  }

  if (picked.length === 0) return EMPTY;
  return { turns: picked.reverse(), totalChars };
}

/**
 * Info: (20260817 - Luphia) 組成 prompt 中的前文區塊。
 * 明確標示這是「先前的對話」，避免模型把歷史當成當前的提問來回答。
 */
export function renderShortTermHistory(turns: IFaithHistoryTurn[]): string {
  if (turns.length === 0) return "";
  const lines = turns.map(
    (turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`,
  );
  return [
    "Previous turns in this conversation (context only; answer the latest User Input):",
    ...lines,
  ].join("\n");
}
