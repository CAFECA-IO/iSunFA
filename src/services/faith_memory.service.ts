import { SystemSettingKey } from "@/constants/system_setting";
import { FAITH_MEMORY_DELETION_REASON } from "@/constants/faith_memory";
import { TEAM_PLAN } from "@/constants/subscription_quota";
import { resolveEffectivePlanId } from "@/services/spend.service";
import {
  memoryItemId,
  mergeMemoryItems,
  removeMemoryItem,
  renderMemoryForPrompt,
  type IFaithMemoryItem,
} from "@/lib/faith_memory/items";
import { faithMemoryRepo } from "@/repositories/faith_memory.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { logger } from "@/lib/utils/logger";
import {
  parseRetentionDays,
  resolveMemoryExpiresAt,
} from "@/lib/faith_memory/retention";
import { DEFAULT_FAITH_MEMORY_RETENTION_DAYS } from "@/constants/llm";
import { systemSettingService } from "@/services/system_setting.service";

/**
 * Info: (20260812 - Luphia) 費思個人化記憶 Service（規範
 * documents/architecture/ai_and_analytics/faith_personal_memory.md）。
 *
 * Info: (20260817 - Luphia) 最小實作上線：儲存、方案 gate、注入、萃取、90 天保留與刪除。
 * 規範 §4.2 的語意去重與 §8 的後台觀測介面仍未實作——那些是好用，
 * 而這裡先讓條款 §3.7 承諾的東西真的存在。
 */

/**
 * Info: (20260812 - Luphia) 生效中的記憶保留天數（規範 §7）。
 *
 * 保留期是營運設定，存於 DB 的簽章式系統設定（ADR 017），可由後台調整、不需重啟；
 * 讀不到或值不合法時退回 DEFAULT_FAITH_MEMORY_RETENTION_DAYS（fail-safe）。
 * **所有需要天數的地方都必須經過這裡**，不得直接引用常數當生效值，
 * 否則後台調整後畫面與刪除行為會各用一個數字。
 */
export async function resolveFaithMemoryRetentionDays(): Promise<number> {
  try {
    const raw = await systemSettingService.get(
      SystemSettingKey.FAITH_MEMORY_RETENTION_DAYS,
    );
    return parseRetentionDays(raw);
  } catch (error) {
    /**
     * Info: (20260812 - Luphia) 兩種失敗都退回承諾值：DB 連線抖動，以及設定驗簽失敗
     * （UNTRUSTED，systemSettingService.get() 會丟錯）。
     *
     * 這裡不照 ADR 017 的「拒絕服務」處置，因為本值不是憑證也不授權任何事；
     * 而退回 90 恰好是**較保守**的方向——被竄改成 3650 天也不會讓該刪的記憶留下來。
     */
    console.error("Failed to resolve faith memory retention days:", error);
    return DEFAULT_FAITH_MEMORY_RETENTION_DAYS;
  }
}

/**
 * Info: (20260817 - Luphia) 方案 Gate（規範 §6.3）。
 *
 * **讀寫兩側都要判**，且 fail-closed：查無訂閱、狀態非 ACTIVE、或已過期一律
 * 視為免費版，不寫入也不讀取。單邊 gate 會造成「免費版讀得到舊記憶」
 * 或「免費版寫得進去」的破口——而後者等於在沒有付費的情境下持續累積個資。
 */
export async function isFaithMemoryEnabled(
  teamId: string,
  nowSec: number,
): Promise<boolean> {
  try {
    const subscription = await teamSubscriptionRepo.getByTeamId(teamId);
    return resolveEffectivePlanId(subscription, nowSec) !== TEAM_PLAN.FREE;
  } catch (error) {
    // Info: (20260817 - Luphia) 查不到訂閱狀態時當作免費版：不讀不寫才是保守解
    logger.error("faith memory plan gate failed", {
      teamId,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Info: (20260817 - Luphia) 取出可注入 prompt 的記憶（規範 §5）。
 *
 * 回傳文字與其長度：長度供預扣估算使用，**必須與實際注入的是同一份**，
 * 否則 hold 會小於實耗，而那會讓 settleSpend 的「只退不補」變成系統吸收差額。
 *
 * 已過期但尚未被守護行程刪除的記憶**不得注入**（規範 §7.2）：
 * fail-closed 的順序永遠是先停止使用，再實際刪除。
 */
export async function loadFaithMemoryForPrompt(params: {
  userId: string;
  teamId: string;
  nowSec: number;
}): Promise<{ text: string; totalChars: number }> {
  const { userId, teamId, nowSec } = params;

  if (!(await isFaithMemoryEnabled(teamId, nowSec))) {
    return { text: "", totalChars: 0 };
  }

  const record = await faithMemoryRepo.get(userId, teamId);
  if (!record) return { text: "", totalChars: 0 };
  if (record.expiresAt && record.expiresAt.getTime() <= nowSec * 1000) {
    return { text: "", totalChars: 0 };
  }

  return renderMemoryForPrompt(record.items);
}

/**
 * Info: (20260817 - Luphia) 併入新萃取的記憶項目（規範 §4.2）。
 *
 * 由呼叫端在**回覆送出之後**執行，且失敗只記 log：
 * 「記憶沒寫成功」絕不能變成使用者看不到答案（規範 §4.2 末條）。
 */
export async function recordFaithMemoryItems(params: {
  userId: string;
  teamId: string;
  items: IFaithMemoryItem[];
  nowSec: number;
}): Promise<void> {
  const { userId, teamId, items, nowSec } = params;
  if (items.length === 0) return;
  if (!(await isFaithMemoryEnabled(teamId, nowSec))) return;

  const existing = await faithMemoryRepo.get(userId, teamId);
  const merged = mergeMemoryItems(existing?.items ?? [], items);
  await faithMemoryRepo.upsert(userId, teamId, merged);
}

/**
 * Info: (20260817 - Luphia) 訂閱終止：排定 90 天後刪除（規範 §7.1）。
 * 天數一律經 `resolveFaithMemoryRetentionDays()`，不直接引用常數——
 * 否則後台調整之後，畫面上的天數與實際刪除時點會各用一個數字。
 */
export async function scheduleFaithMemoryExpiry(
  teamId: string,
  terminatedAtMs: number,
): Promise<number> {
  const days = await resolveFaithMemoryRetentionDays();
  /**
   * Info: (20260818 - Luphia) 用 `resolveMemoryExpiresAt` 而不是自己再算一次（第三輪 B-5）。
   *
   * 原本這裡寫的是 `new Date(terminatedAtMs + days * 86_400_000)`——與
   * `retention.ts` 的實作重複，而那支函式的註解正好寫著「推導點一多，
   * 條款承諾的那個日期就會出現兩種算法」。它自己就是第二種。
   */
  const expiresAt = resolveMemoryExpiresAt(terminatedAtMs, days);
  return faithMemoryRepo.setExpiry(teamId, expiresAt);
}

// Info: (20260817 - Luphia) 恢復訂閱：取消排定的刪除，記憶延續（規範 §7.1）
export async function cancelFaithMemoryExpiry(teamId: string): Promise<number> {
  return faithMemoryRepo.clearExpiry(teamId);
}

/**
 * Info: (20260817 - Luphia) 使用者主動要求刪除（條款 §3.7、隱私政策 §6）。
 * 立即硬刪，不等 90 天。
 */
export async function deleteFaithMemoryByRequest(
  userId: string,
  teamId: string,
): Promise<boolean> {
  return faithMemoryRepo.deleteByScope(
    userId,
    teamId,
    FAITH_MEMORY_DELETION_REASON.USER_REQUEST,
  );
}

export interface IFaithMemoryView {
  id: string;
  category: string;
  statement: string;
  updatedAt: number;
}

/**
 * Info: (20260817 - Luphia) 檢視自己的記憶（「文件與記憶」頁）。
 *
 * 條款沒有承諾這個介面，但使用者一定會問「它到底記了我什麼」——
 * 而在此之前唯一的答案是「只能整包刪掉」。看得見才談得上是自己的資料。
 *
 * 方案 gate 照樣適用：免費版沒有長期記憶，也就沒有東西可看。
 * 已過期未刪的一樣不顯示，與注入側同一條規則。
 */
export async function listFaithMemory(params: {
  userId: string;
  teamId: string;
  nowSec: number;
}): Promise<{ enabled: boolean; items: IFaithMemoryView[] }> {
  const { userId, teamId, nowSec } = params;

  if (!(await isFaithMemoryEnabled(teamId, nowSec))) {
    return { enabled: false, items: [] };
  }

  const record = await faithMemoryRepo.get(userId, teamId);
  if (!record) return { enabled: true, items: [] };
  if (record.expiresAt && record.expiresAt.getTime() <= nowSec * 1000) {
    return { enabled: true, items: [] };
  }

  const items = [...record.items]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((item) => ({
      id: memoryItemId(item),
      category: item.category,
      statement: item.statement,
      updatedAt: item.updatedAt,
    }));

  return { enabled: true, items };
}

/**
 * Info: (20260817 - Luphia) 刪除單一條目（「文件與記憶」頁）。
 *
 * 整包刪除是條款承諾的「被遺忘權」，逐條刪除是它的實用版本：
 * 費思記錯一件事時，使用者要的是把那一條拿掉，而不是把累積的偏好全部丟掉。
 *
 * **不判方案**：免費版（可能是降級後）同樣有權刪掉自己的資料——
 * gate 管的是「能不能用」，不是「能不能刪」。
 */
export async function deleteFaithMemoryItem(params: {
  userId: string;
  teamId: string;
  itemId: string;
}): Promise<boolean> {
  const { userId, teamId, itemId } = params;

  const record = await faithMemoryRepo.get(userId, teamId);
  if (!record) return false;

  const { items, removed } = removeMemoryItem(record.items, itemId);
  if (!removed) return false;

  /**
   * Info: (20260817 - Luphia) 刪到一條不剩就整列刪掉並寫稽核，
   * 不要留一列空記憶——那既佔著 `expiresAt` 的排程，
   * 也讓「使用者還有沒有記憶」這個問題多一種答案。
   */
  if (items.length === 0) {
    await faithMemoryRepo.deleteByScope(
      userId,
      teamId,
      FAITH_MEMORY_DELETION_REASON.USER_REQUEST,
    );
    return true;
  }

  /**
   * Info: (20260818 - Luphia) 刪一條也要寫稽核（第三輪 C-6）。
   *
   * 規範 §6.2 的分級規則是「刪除必寫稽核」。先前只有刪到一條不剩才留紀錄——
   * 刪掉 49/50 條，稽核表一列都沒有，而那與「整包刪除」在資料上的差別只有一條。
   */
  await faithMemoryRepo.upsertWithDeletionLog({
    userId,
    teamId,
    items,
    removedCount: record.items.length - items.length,
    reason: FAITH_MEMORY_DELETION_REASON.USER_REQUEST,
  });
  return true;
}
