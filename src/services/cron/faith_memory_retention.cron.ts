import { logger } from "@/lib/utils/logger";
import { faithMemoryRepo } from "@/repositories/faith_memory.repo";
import { FAITH_MEMORY_DELETION_REASON } from "@/constants/faith_memory";
import {
  cancelFaithMemoryExpiry,
  scheduleFaithMemoryExpiry,
} from "@/services/faith_memory.service";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { resolveEffectivePlanId } from "@/lib/subscription/plan_rules";
import { TEAM_PLAN } from "@/constants/subscription_quota";

/**
 * Info: (20260817 - Luphia) 費思記憶的保留期守護行程（規範 §7.2）。
 *
 * 條款 §3.7 與隱私政策 §5 承諾「訂閱終止後保留 90 天，屆滿刪除」。
 * 這支是那個承諾的執行者——它失敗是**合規風險**，不是背景雜訊，因此失敗要告警。
 *
 * 兩個階段，順序有意義：
 *
 * 1. **對帳**：比對每個團隊「現在是不是付費方案」與「記憶有沒有排定刪除」，
 *    不一致就補上或取消。刻意做成對帳而非掛在降級事件上——事件會漏（降級路徑
 *    不只一條，而且這個功能上線前就已經降級的團隊沒有事件可掛），
 *    而對帳每天都會把狀態拉回正確，也天然冪等。
 *
 * 2. **刪除**：`expiresAt <= now` 的一律**硬刪除**並寫稽核。
 *    條款承諾的是「刪除」，留一筆 `deletedAt` 不算刪除。
 *
 * 守護行程未跑到的間隙不構成違約（承諾是「屆滿後刪除」），
 * 而讀取側已經先行擋住：已過期但尚未刪除的記憶不會被注入 prompt。
 * fail-closed 的順序永遠是先停止使用，再實際刪除。
 */

// Info: (20260817 - Luphia) 單批刪除量：避免一次撈過整張表
const DELETE_BATCH_SIZE = 500;

/**
 * Info: (20260818 - Luphia) 單次執行的總量上界（第三輪 C-10）。
 *
 * 一輪內會分批清到沒有為止，但仍需要一個天花板——否則一次異常的大量到期
 * 會讓這支跑到下一輪都還沒結束。10,000 筆已遠超正常的每日到期量。
 */
const MAX_DELETES_PER_RUN = 10_000;

/**
 * Info: (20260818 - Luphia) 單次執行的失敗上界（第五輪 T-6 的副產物）。
 *
 * 失敗的列會被排除（見下方 `failedIds`），因此候選集合每輪嚴格變小，迴圈本來
 * 就會結束。這個上界是另一層保險：DB 整個掛掉時，不要在同一輪裡試上萬次、
 * 寫上萬筆 error log——那既幫不上忙，也會把真正有用的日誌淹掉。
 */
const MAX_FAILURES_PER_RUN = 10_000;

export interface IFaithMemoryRetentionResult {
  scheduled: number;
  cancelled: number;
  deleted: number;
  failed: number;
}

/**
 * Info: (20260818 - Luphia) 單次執行的上界可由呼叫端調整（第五輪 T-6）。
 *
 * 兩個用途：
 *
 * 1. **維運**：大量同期到期時想分次清（例如避開尖峰），可以壓低 `maxDeletes`
 *    跑幾輪，而不是改常數重新部署。
 * 2. **測試**：常數是 10,000，任何測試都撞不到它，於是「上界只算成功刪除、
 *    失敗不吃預算」（第五輪 C-3）這個性質**沒有任何測試釘得住**——把條件改回
 *    `deleted + failed` 全部照樣綠。給得了小上界才測得到那件事。
 */
export interface IFaithMemoryRetentionOptions {
  maxDeletes?: number;
  maxFailures?: number;
  batchSize?: number;
}

export async function runFaithMemoryRetention(
  nowMs: number = Date.now(),
  options: IFaithMemoryRetentionOptions = {},
): Promise<IFaithMemoryRetentionResult> {
  const maxDeletes = options.maxDeletes ?? MAX_DELETES_PER_RUN;
  const maxFailures = options.maxFailures ?? MAX_FAILURES_PER_RUN;
  const batchSize = options.batchSize ?? DELETE_BATCH_SIZE;
  const nowSec = Math.floor(nowMs / 1000);
  let scheduled = 0;
  let cancelled = 0;

  /**
   * Info: (20260818 - Luphia) 1. 對帳：訂閱狀態與刪除排程是否一致。
   *
   * 訂閱**一次批次載入**（第三輪 C-10）：原本每個團隊打一趟 `getByTeamId`
   * 且完全序列，一萬個有記憶的團隊就是一萬趟往返。這支跑得越久，
   * 落後的刪除就越多——而落後期間資料仍留在庫裡超過條款承諾的期間。
   */
  const teams = await faithMemoryRepo.listTeamRetentionState();
  const subscriptions = await teamSubscriptionRepo.listByTeamIds(
    teams.map((team) => team.teamId),
  );
  const planByTeam = new Map(
    subscriptions.map((subscription) => [
      subscription.teamId,
      resolveEffectivePlanId(subscription, nowSec),
    ]),
  );

  for (const team of teams) {
    /**
     * Info: (20260818 - Luphia) 查無訂閱＝免費版（fail-closed，與
     * `isFaithMemoryEnabled` 同一條規則）。這裡不再逐團隊呼叫那支函式，
     * 因為它每次都會自己去查一次訂閱——那正是 N+1 的來源。
     */
    const paid =
      (planByTeam.get(team.teamId) ?? TEAM_PLAN.FREE) !== TEAM_PLAN.FREE;
    if (paid) {
      cancelled += await cancelFaithMemoryExpiry(team.teamId);
    } else {
      /**
       * Info: (20260817 - Luphia) 起算點是「訂閱終止日」，而這支拿不到那個日期
       * （`expireOverdue` 只回筆數）。以**發現當日**起算是刻意的保守選擇：
       * 它只會讓保留期比承諾的更長，不會更短——而「提早刪掉使用者的資料」
       * 是這兩個方向裡不可回復的那一個。
       */
      scheduled += await scheduleFaithMemoryExpiry(team.teamId, nowMs);
    }
  }

  /**
   * Info: (20260818 - Luphia) 2. 刪除到期者——一輪內清到沒有為止（第三輪 C-10）。
   *
   * 原本是「每輪 500 筆、每 6 小時一次」＝每日上限 2,000 筆。大批同期到期
   * （例如一次促銷的訂閱同時到期）會逐日落後，而落後期間資料仍留在庫裡
   * 超過條款承諾的期間。改為在一輪內分批清空，並保留一個總量上界
   * 以免單次執行無限延長。
   */
  let deleted = 0;
  let failed = 0;
  /**
   * Info: (20260818 - Luphia) 游標：本輪已經看過的最後一列（第六輪第 6 條）。
   *
   * 先前是把失敗過的 id 收成清單、以 `NOT IN` 排除。那擋住了「毒資料被一再撈
   * 回來」，但清單會長大——資料庫整體故障時每批全失敗，它會長到失敗上界
   * （預設 10,000），之後每次查詢都帶一萬個參數。
   *
   * 游標沒有這個成長，而且提供更強的保證：同一輪內每一列最多被看到一次
   * （不只是失敗的那些）。下一輪從頭開始，因此失敗的列不會被遺忘。
   */
  let cursor: { expiresAt: Date; id: string } | undefined;

  /**
   * Info: (20260818 - Luphia) 上界只算**成功刪除**的數量（第五輪 C-3）。
   *
   * 原本是 `deleted + failed`，於是失敗會吃掉刪除預算：499 筆毒資料時，
   * 20 批就把 10,000 的上界用光，而本輪真正刪掉的只有約 20 列。
   * 上界的用意是「單次執行不要無限延長」，那應該由做成的事來計量。
   * 失敗本身另有兩道界線：游標（每列最多被看到一次）與失敗次數上界。
   */
  while (deleted < maxDeletes && failed < maxFailures) {
    const expired = await faithMemoryRepo.listExpired(
      new Date(nowMs),
      batchSize,
      cursor,
    );
    if (expired.length === 0) break;

    /**
     * Info: (20260818 - Luphia) 游標推到本批最後一列（不論成功或失敗）。
     * 排序是 `(expiresAt, id)` 的全序，因此下一批必定是嚴格更後面的列——
     * 迴圈因此單調前進，不需要任何「整批失敗就停」的特例。
     */
    const last = expired[expired.length - 1];
    cursor = { expiresAt: last.expiresAt as Date, id: last.id };

    for (const row of expired) {
      try {
        await faithMemoryRepo.deleteWithLog({
          id: row.id,
          userId: row.userId,
          teamId: row.teamId,
          itemCount: row.itemCount,
          reason: FAITH_MEMORY_DELETION_REASON.RETENTION_EXPIRED,
        });
        deleted += 1;
      } catch (error) {
        /**
         * Info: (20260817 - Luphia) 單筆失敗不中斷整批——一筆壞資料不該讓
         * 其他所有到期的記憶都留下來。但失敗要記，而且下一輪會再試
         * （`expiresAt` 還在，這支天然可重入）。
         */
        failed += 1;
        logger.error("faith memory deletion failed", {
          userId: row.userId,
          teamId: row.teamId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (scheduled || cancelled || deleted || failed) {
    logger.info("faith memory retention run", {
      scheduled,
      cancelled,
      deleted,
      failed,
    });
  }

  /**
   * Info: (20260817 - Luphia) 有失敗就明確告警：這裡的失敗是「該刪的沒刪掉」，
   * 屬於合規風險，不可以只留在 info log 裡等人翻（CLAUDE.md §6）。
   */
  if (failed > 0) {
    logger.error("faith memory retention had failures", { failed });
  }

  return { scheduled, cancelled, deleted, failed };
}
