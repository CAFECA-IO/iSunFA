import { logger } from "@/lib/utils/logger";
import { faithMemoryRepo } from "@/repositories/faith_memory.repo";
import { FAITH_MEMORY_DELETION_REASON } from "@/constants/faith_memory";
import {
  cancelFaithMemoryExpiry,
  isFaithMemoryEnabled,
  scheduleFaithMemoryExpiry,
} from "@/services/faith_memory.service";

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

// Info: (20260817 - Luphia) 單輪刪除量上限：避免一次交易掃過整張表
const DELETE_BATCH_SIZE = 500;

export interface IFaithMemoryRetentionResult {
  scheduled: number;
  cancelled: number;
  deleted: number;
  failed: number;
}

export async function runFaithMemoryRetention(
  nowMs: number = Date.now(),
): Promise<IFaithMemoryRetentionResult> {
  const nowSec = Math.floor(nowMs / 1000);
  let scheduled = 0;
  let cancelled = 0;

  // Info: (20260817 - Luphia) 1. 對帳：訂閱狀態與刪除排程是否一致
  const teams = await faithMemoryRepo.listTeamRetentionState();
  for (const team of teams) {
    const paid = await isFaithMemoryEnabled(team.teamId, nowSec);
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

  // Info: (20260817 - Luphia) 2. 刪除到期者
  const expired = await faithMemoryRepo.listExpired(
    new Date(nowMs),
    DELETE_BATCH_SIZE,
  );

  let deleted = 0;
  let failed = 0;
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
