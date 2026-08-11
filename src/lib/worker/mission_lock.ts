import fs from "fs/promises";
import { unlinkSync } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { logger } from "@/lib/utils/logger";
import {
  MISSION_LOCK_FILE_NAME,
  MISSION_LOCK_HARD_EXPIRY_MS,
  MISSION_LOCK_HEARTBEAT_INTERVAL_MS,
  MISSION_LOCK_STALE_AFTER_MS,
} from "@/constants/mission_executor";

/**
 * Info: (20260811 - Luphia) Mission 執行鎖。
 *
 * ── 它要解決的問題 ──
 * 舊版的鎖檔只寫一個時間戳，回收條件是「這個時間戳超過一小時」。於是 worker 被強制
 * 中斷時（SIGKILL、關掉終端機、機器休眠），鎖會留在原地，而那個 mission 必須整整
 * 等一小時才會被別人撿起來——即使持有它的行程早就不存在了。
 * 20260811 的 mission 288 就是這樣停在 `running` 狀態：只有鎖檔，沒有 execution_log、
 * 沒有 result、也沒有 failed_，因為前一個 worker 在寫出任何結果之前就被殺掉了。
 *
 * ── 做法 ──
 * 鎖檔改成 JSON，記下持有者是誰（workerId / pid / hostname）並持續更新 heartbeat。
 * 「還在執行嗎」因此從「開始多久了」變成「最近還有沒有心跳」，兩件事分開之後，
 * 執行時間長不再等於無法回收，行程死亡也不再需要等一小時。
 *
 * 判定順序刻意保守——誤判「已死」的代價是同一個 mission 被執行兩次（重複花 token、
 * 重複送出），比多等一會兒嚴重：
 *   1. heartbeat 還新 → 視為存活，不動它
 *   2. heartbeat 過期，且能證明持有行程已消失（同一台機器、pid 不存在）→ 立刻回收
 *   3. heartbeat 過期，但無法證明它死了（跨機器、或 pid 可能被重用）→ 等硬性上限
 *
 * SIGKILL 與斷電無法在死前釋放鎖，這正是 heartbeat 存在的理由；
 * 可以攔截的結束路徑則由 releaseHeldMissionLocksSync() 主動清掉（見 worker 進入點）。
 */

// Info: (20260811 - Luphia) 同一個行程內的所有鎖共用一組身分，方便從 log 追出是誰持有
const WORKER_ID = process.env.WORKER_ID || randomUUID().slice(0, 8);
const HOSTNAME = os.hostname();

export interface IMissionLockRecord {
  workerId: string;
  pid: number;
  hostname: string;
  startedAt: number;
  heartbeat: number;
  // Info: (20260811 - Luphia) 舊版格式（純時間戳）解析出來的紀錄，判定規則不同
  legacy?: boolean;
}

export interface IMissionLockHandle {
  release: () => Promise<void>;
}

// Info: (20260811 - Luphia) 本行程目前持有的鎖：檔案路徑 → heartbeat 計時器
const heldLocks = new Map<string, NodeJS.Timeout>();

function lockPath(taskDir: string): string {
  return path.join(taskDir, MISSION_LOCK_FILE_NAME);
}

/**
 * Info: (20260811 - Luphia) 判斷一個 pid 是否還存在。
 * signal 0 不會真的送出訊號，只做權限與存在性檢查；
 * EPERM 代表行程存在但不屬於我們，那也算存活。
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Info: (20260811 - Luphia) 解析鎖檔。無法解析成 JSON 的一律當成舊版純時間戳格式。
 * 內容完全讀不懂時回 null，由呼叫端當成「沒有有效的鎖」處理——
 * 一個壞掉的鎖檔不該讓 mission 永久停擺。
 */
export function parseMissionLock(content: string): IMissionLockRecord | null {
  const raw = content.trim();
  if (raw.length === 0) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Partial<IMissionLockRecord>;
      if (
        typeof record.heartbeat === "number" &&
        typeof record.startedAt === "number"
      ) {
        return {
          workerId: record.workerId ?? "unknown",
          pid: typeof record.pid === "number" ? record.pid : 0,
          hostname: record.hostname ?? "",
          startedAt: record.startedAt,
          heartbeat: record.heartbeat,
        };
      }
      return null;
    }
  } catch {
    // Info: (20260811 - Luphia) 不是 JSON，往下試舊版格式
  }

  const timestamp = Number.parseInt(raw, 10);
  if (Number.isNaN(timestamp)) return null;

  return {
    workerId: "legacy",
    pid: 0,
    hostname: "",
    startedAt: timestamp,
    heartbeat: timestamp,
    legacy: true,
  };
}

export interface IMissionLockVerdict {
  reclaimable: boolean;
  reason: string;
}

/**
 * Info: (20260811 - Luphia) 這把鎖可以被接手嗎。
 * 純函式、時間由呼叫端傳入，讓判定規則本身可被測試——
 * 這段邏輯壞掉的症狀是「mission 悄悄停擺」或「同一個 mission 跑兩次」，兩者都不會噴錯。
 */
export function evaluateMissionLock(
  record: IMissionLockRecord,
  now: number,
): IMissionLockVerdict {
  if (now - record.heartbeat <= MISSION_LOCK_STALE_AFTER_MS) {
    return { reclaimable: false, reason: "heartbeat is fresh" };
  }

  /**
   * Info: (20260811 - Luphia) 舊版格式（純時間戳）沒有 heartbeat 可言，一旦過期就回收。
   *
   * 依據是：會寫出這種格式的只有舊版程式碼，而新版已經在跑，代表那個行程必然已被重啟。
   * 唯一的例外是新舊 worker 同時在跑的部署空窗，此時可能造成一次重複執行；
   * 相對於「保證浪費一小時」，這個取捨是划算的。這條路徑會留 warn log。
   */
  if (record.legacy) {
    return {
      reclaimable: true,
      reason: "legacy timestamp lock without heartbeat",
    };
  }

  if (now - record.startedAt >= MISSION_LOCK_HARD_EXPIRY_MS) {
    return { reclaimable: true, reason: "hard expiry reached" };
  }

  // Info: (20260811 - Luphia) 只有同一台機器上的 pid 才驗得出存活與否
  if (record.hostname === HOSTNAME && record.pid > 0) {
    if (!isProcessAlive(record.pid)) {
      return { reclaimable: true, reason: `holder pid ${record.pid} is gone` };
    }
    /**
     * Info: (20260811 - Luphia) 行程還在但心跳停了：事件迴圈被卡住之類的異常狀態。
     * 不搶——搶了會變成兩個行程跑同一個 mission。留給硬性上限處理，並記錄下來。
     */
    return {
      reclaimable: false,
      reason: `holder pid ${record.pid} alive but not heartbeating`,
    };
  }

  return {
    reclaimable: false,
    reason: "holder on another host; waiting for hard expiry",
  };
}

/**
 * Info: (20260811 - Luphia) 檢查某個 mission 目錄是否被有效的鎖擋住。
 * 回傳 true 表示「別人正在做，跳過」；過期的鎖會在這裡順手清掉，
 * 讓後續的 acquire（以 wx 建檔）能成功。
 */
export async function isMissionLocked(taskDir: string): Promise<boolean> {
  const file = lockPath(taskDir);

  let content: string;
  try {
    content = await fs.readFile(file, "utf8");
  } catch {
    // Info: (20260811 - Luphia) 沒有鎖檔就是沒被鎖
    return false;
  }

  const record = parseMissionLock(content);
  if (!record) {
    logger.warn("Removing unreadable mission lock", { taskDir });
    await fs.unlink(file).catch(() => {});
    return false;
  }

  const verdict = evaluateMissionLock(record, Date.now());
  if (!verdict.reclaimable) return true;

  logger.warn("Reclaiming stale mission lock", {
    taskDir,
    reason: verdict.reason,
    holder: record.workerId,
    holderPid: record.pid,
    holderHost: record.hostname,
    heartbeatAgeMs: Date.now() - record.heartbeat,
  });
  await fs.unlink(file).catch(() => {});
  return false;
}

/**
 * Info: (20260811 - Luphia) 取得鎖。以 `wx` 建檔保證原子性——多個 worker 同時搶時只有一個成功。
 * 取得後啟動 heartbeat；回傳 null 代表被別人搶先。
 */
export async function acquireMissionLock(
  taskDir: string,
): Promise<IMissionLockHandle | null> {
  const file = lockPath(taskDir);
  const now = Date.now();
  const record: IMissionLockRecord = {
    workerId: WORKER_ID,
    pid: process.pid,
    hostname: HOSTNAME,
    startedAt: now,
    heartbeat: now,
  };

  try {
    await fs.writeFile(file, JSON.stringify(record), { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return null;
    throw error;
  }

  /**
   * Info: (20260811 - Luphia) unref：heartbeat 不該讓行程活著。
   * 沒有 unref 的話，即使主迴圈已結束，這個計時器仍會撐住事件迴圈讓行程無法退出。
   */
  const timer = setInterval(() => {
    void fs
      .writeFile(file, JSON.stringify({ ...record, heartbeat: Date.now() }))
      .catch((error: unknown) => {
        logger.warn("Failed to refresh mission lock heartbeat", {
          taskDir,
          message: (error as Error).message,
        });
      });
  }, MISSION_LOCK_HEARTBEAT_INTERVAL_MS);
  timer.unref();

  heldLocks.set(file, timer);

  return {
    release: async () => {
      clearInterval(timer);
      heldLocks.delete(file);
      await fs.unlink(file).catch(() => {});
    },
  };
}

/**
 * Info: (20260811 - Luphia) 同步釋放本行程持有的所有鎖。
 *
 * 刻意用同步 API：這支函式的呼叫時機是行程即將結束（收到第二次中斷訊號、
 * 未捕捉的例外、exit handler），那些時機沒有機會 await——非同步的 unlink 會來不及執行。
 *
 * 它救不了 SIGKILL 與斷電，那是 heartbeat 的職責；這裡處理的是「我們攔得到的結束路徑」，
 * 讓正常的中斷不必等 heartbeat 過期。
 */
export function releaseHeldMissionLocksSync(): void {
  for (const [file, timer] of heldLocks) {
    clearInterval(timer);
    try {
      unlinkSync(file);
    } catch {
      // Info: (20260811 - Luphia) 已被移除或無權限；行程正在結束，沒有補救空間也不該拋錯
    }
  }
  heldLocks.clear();
}

// Info: (20260811 - Luphia) 供 worker 進入點在關機流程中判斷是否還有未釋放的鎖
export function heldMissionLockCount(): number {
  return heldLocks.size;
}
