import { createHash } from "crypto";
import {
  FAITH_MEMORY_CATEGORY,
  FAITH_MEMORY_MAX_ITEMS,
  FAITH_MEMORY_PROMPT_MAX_CHARS,
  FAITH_MEMORY_STATEMENT_MAX_CHARS,
  type FaithMemoryCategory,
} from "@/constants/faith_memory";

/**
 * Info: (20260817 - Luphia) 費思長期記憶的項目運算（規範 §4.2、§5）。
 *
 * 純函式：不碰 DB、不碰 LLM、不讀時間（`nowSec` 由呼叫端注入）。
 * 記憶會影響每一輪的回答與扣點，因此「哪些留下、哪些淘汰、注入多少」
 * 必須是決定論的——同一組輸入永遠得到同一個結果，才有辦法對帳與重現。
 */

export interface IFaithMemoryItem {
  category: FaithMemoryCategory;
  statement: string;
  // Info: (20260817 - Luphia) epoch 秒，淘汰與去重用
  updatedAt: number;
}

const CATEGORIES = new Set<string>(Object.values(FAITH_MEMORY_CATEGORY));

/**
 * Info: (20260817 - Luphia) 嚴禁把數值型事實記進記憶（規範 §4.2）。
 *
 * 金額、餘額、稅率、排放係數的唯一真相在 DB 與規則引擎。記進記憶等於讓 LLM
 * 當事實資料庫（CLAUDE.md §7），而且會在數字變動之後持續複述舊值——
 * 那比「不記得」嚴重得多，因為它聽起來是有根據的。
 *
 * 以確定性規則攔截，不靠 prompt 自律：prompt 只是請求，這裡是門。
 */
const NUMERIC_PATTERN = /\d/;

/**
 * Info: (20260818 - Luphia) 換行是 prompt 注入的載具（第三輪 B-4）。
 *
 * 記憶以 `- [CATEGORY] ${statement}` 的形式注入，statement 帶換行就能自己
 * 長出新的區塊——例如偽造一段 `Output Guidelines:` 覆蓋掉人設與安全指令。
 *
 * 範圍限縮：記憶鍵是 `(userId, teamId)` 且注入時 userId 來自 session，
 * 因此**影響不到其他使用者**。但它是自我注入 + 跨 session 持久化：
 * 講一次就寫進記憶，之後每一輪都會重新注入，而費思是會計場景的顧問。
 */
const LINE_BREAK_PATTERN = /[\n\r\u2028\u2029]/;

export function isStorableStatement(statement: string): boolean {
  const trimmed = statement.trim();
  if (!trimmed) return false;
  if (trimmed.length > FAITH_MEMORY_STATEMENT_MAX_CHARS) return false;
  if (LINE_BREAK_PATTERN.test(trimmed)) return false;
  // Info: (20260817 - Luphia) 含任何數字一律不收——寧可少記，不可記錯數字
  return !NUMERIC_PATTERN.test(trimmed);
}

/**
 * Info: (20260817 - Luphia) 去重用的正規化（規範 §4.2）：去空白、轉小寫。
 *
 * 刻意**不做語意相似度比對**：那不決定論，同一句話兩次萃取可能一次判重、
 * 一次沒判，於是記憶的內容會隨呼叫順序漂移。
 */
function normalize(statement: string): string {
  return statement.replace(/\s+/g, "").toLowerCase();
}

function dedupeKey(item: IFaithMemoryItem): string {
  return `${item.category}::${normalize(item.statement)}`;
}

/**
 * Info: (20260817 - Luphia) 條目的穩定識別碼（供「文件與記憶」頁逐條刪除）。
 *
 * 由 `(category, 正規化後的 statement)` 推導，**不另存欄位**：
 * 那組值本來就是去重鍵，而去重時保留原本的文字、只更新時間，
 * 因此同一條記憶的 id 在合併之間不會變。存一個 uuid 反而要處理
 * 「既有資料沒有 id」的相容問題，而它換不到任何東西。
 *
 * 截短到 16 個十六進位字元：這不是安全邊界（刪除的授權來自
 * `(userId, teamId)`，見 API），只是一個夠穩定、夠短的識別碼。
 */
export function memoryItemId(item: IFaithMemoryItem): string {
  return createHash("sha256")
    .update(dedupeKey(item))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Info: (20260817 - Luphia) 移除指定的條目。回傳新陣列與是否真的移除了。
 * 找不到就回原陣列與 false——「已經不在了」不是錯誤（重複點刪除是常見操作）。
 */
export function removeMemoryItem(
  items: readonly IFaithMemoryItem[],
  itemId: string,
): { items: IFaithMemoryItem[]; removed: boolean } {
  const kept = items.filter((item) => memoryItemId(item) !== itemId);
  return { items: kept, removed: kept.length !== items.length };
}

/**
 * Info: (20260817 - Luphia) 把新萃取的項目併入既有記憶。
 *
 * 規則三條，順序有意義：
 * 1. **過濾**不可儲存的（空、過長、含數字）
 * 2. **去重**：同分類且正規化後相同 → 更新 `updatedAt`，不新增一列
 * 3. **淘汰**：超過上限時丟 `updatedAt` 最舊的（LRU）
 *
 * 回傳新陣列，不改動輸入——呼叫端可能還要拿原值做比較。
 */
export function mergeMemoryItems(
  existing: readonly IFaithMemoryItem[],
  incoming: readonly IFaithMemoryItem[],
): IFaithMemoryItem[] {
  const byKey = new Map<string, IFaithMemoryItem>();

  for (const item of existing) {
    if (!CATEGORIES.has(item.category)) continue;
    byKey.set(dedupeKey(item), { ...item });
  }

  for (const item of incoming) {
    if (!CATEGORIES.has(item.category)) continue;
    if (!isStorableStatement(item.statement)) continue;

    const statement = item.statement.trim();
    const key = dedupeKey({ ...item, statement });
    const previous = byKey.get(key);

    /**
     * Info: (20260817 - Luphia) 已存在就只更新時間，保留原本的文字。
     * 用新文字覆蓋會讓「同一件事」的措辭隨每次萃取變動，
     * 而使用者看到的記憶清單應該是穩定的。
     */
    byKey.set(key, {
      category: item.category,
      statement: previous?.statement ?? statement,
      updatedAt: Math.max(item.updatedAt, previous?.updatedAt ?? 0),
    });
  }

  const merged = [...byKey.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  return merged.slice(0, FAITH_MEMORY_MAX_ITEMS);
}

/**
 * Info: (20260817 - Luphia) 組成注入 prompt 的記憶區塊（規範 §5）。
 *
 * 由新到舊填入，直到字元預算為止——預算是**硬上界**，因此預扣估算
 * 仍是成本上界，`settleSpend` 的「只退不補」不變式維持。
 *
 * 回傳文字與其長度：長度供預扣估算使用，必須與實際注入的是同一份
 * （同短期記憶的理由，見 short_term.ts）。
 */
export function renderMemoryForPrompt(items: readonly IFaithMemoryItem[]): {
  text: string;
  totalChars: number;
} {
  if (items.length === 0) return { text: "", totalChars: 0 };

  const ordered = [...items].sort((a, b) => b.updatedAt - a.updatedAt);
  const lines: string[] = [];
  let used = 0;

  for (const item of ordered) {
    /**
     * Info: (20260818 - Luphia) 注入時再壓一次單行（第三輪 B-4）。
     *
     * 寫入側已經拒收換行，但這道檢查是 2026-08-18 才加的——在那之前寫進去的
     * 條目仍可能帶換行。防注入的規則要放在**輸出**這一側才涵蓋得到既有資料。
     */
    const statement = item.statement.replace(/\s+/g, " ").trim();
    const line = `- [${item.category}] ${statement}`;
    if (used + line.length > FAITH_MEMORY_PROMPT_MAX_CHARS) break;
    lines.push(line);
    used += line.length;
  }

  if (lines.length === 0) return { text: "", totalChars: 0 };

  const text = [
    "Known preferences of this user (apply them; they are not questions to answer):",
    ...lines,
  ].join("\n");
  return { text, totalChars: text.length };
}

/**
 * Info: (20260817 - Luphia) LLM 萃取結果的型別收斂（CLAUDE.md §2：外部資料先縮型別）。
 * 不合格的項目安靜丟棄——萃取失敗不該讓使用者看不到回覆（規範 §4.2）。
 */
export function parseExtractedItems(
  raw: unknown,
  nowSec: number,
): IFaithMemoryItem[] {
  if (!Array.isArray(raw)) return [];

  const items: IFaithMemoryItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { category, statement } = entry as {
      category?: unknown;
      statement?: unknown;
    };
    if (typeof category !== "string" || !CATEGORIES.has(category)) continue;
    if (typeof statement !== "string" || !isStorableStatement(statement)) {
      continue;
    }
    items.push({
      category: category as FaithMemoryCategory,
      statement: statement.trim(),
      updatedAt: nowSec,
    });
  }
  return items;
}
