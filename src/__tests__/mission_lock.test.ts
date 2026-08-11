import { describe, it, expect } from "@jest/globals";
import os from "os";
import {
  evaluateMissionLock,
  parseMissionLock,
  type IMissionLockRecord,
} from "@/lib/worker/mission_lock";
import {
  MISSION_LOCK_HARD_EXPIRY_MS,
  MISSION_LOCK_STALE_AFTER_MS,
} from "@/constants/mission_executor";

/**
 * Info: (20260811 - Luphia) 這組測試守的是 mission 執行鎖的接手判定。
 *
 * 20260811 的事故：worker 被強制中斷後留下孤兒鎖，而舊版的回收條件是「時間戳超過一小時」，
 * 於是 mission 288 只有 `running` 檔、沒有 execution_log / result / failed_，
 * 整整停擺一小時——持有它的行程早就不存在了。
 *
 * 判定錯誤的兩個方向代價不對稱，兩邊都必須釘住：
 * - 太保守 → mission 無聲停擺（就是那次事故）
 * - 太積極 → 同一個 mission 被兩個 worker 同時執行，重複花 token、重複送出
 * 兩者都不會拋錯，所以只有測試看得見。
 */

const NOW = 1_800_000_000_000;

function record(
  overrides: Partial<IMissionLockRecord> = {},
): IMissionLockRecord {
  return {
    workerId: "worker-a",
    pid: process.pid,
    hostname: os.hostname(),
    startedAt: NOW,
    heartbeat: NOW,
    ...overrides,
  };
}

describe("parseMissionLock", () => {
  it("解析新版 JSON 格式", () => {
    const parsed = parseMissionLock(JSON.stringify(record()));

    expect(parsed).toMatchObject({ workerId: "worker-a", heartbeat: NOW });
    expect(parsed?.legacy).toBeUndefined();
  });

  /**
   * Info: (20260811 - Luphia) 舊版鎖檔是一個裸的毫秒時間戳（例如 mission 288 的 `1786432115244`）。
   * 升級後必須還讀得懂，否則既有的鎖會被當成「壞檔」處理。
   */
  it("解析舊版純時間戳格式並標記為 legacy", () => {
    const parsed = parseMissionLock("1786432115244");

    expect(parsed).toMatchObject({
      startedAt: 1786432115244,
      heartbeat: 1786432115244,
      legacy: true,
    });
  });

  it("空白或無法解析的內容回 null", () => {
    expect(parseMissionLock("")).toBeNull();
    expect(parseMissionLock("   ")).toBeNull();
    expect(parseMissionLock("not-a-lock")).toBeNull();
    // Info: (20260811 - Luphia) 是 JSON 但缺必要欄位，同樣不可信
    expect(parseMissionLock('{"workerId":"x"}')).toBeNull();
  });
});

describe("evaluateMissionLock", () => {
  it("heartbeat 還新時不得接手", () => {
    const verdict = evaluateMissionLock(
      record({ heartbeat: NOW - MISSION_LOCK_STALE_AFTER_MS + 1_000 }),
      NOW,
    );

    expect(verdict.reclaimable).toBe(false);
  });

  /**
   * Info: (20260811 - Luphia) 這是修正的核心：持有行程已消失時**立刻**可接手，
   * 不必等硬性上限。舊版在這個情境下會白等一小時。
   */
  it("同機且持有行程已消失時立刻可接手", () => {
    // Info: (20260811 - Luphia) pid 0 在 process.kill 中有特殊語意，用一個不存在的高位 pid
    const verdict = evaluateMissionLock(
      record({
        pid: 0x7ffffff0,
        heartbeat: NOW - MISSION_LOCK_STALE_AFTER_MS - 1,
      }),
      NOW,
    );

    expect(verdict.reclaimable).toBe(true);
    expect(verdict.reason).toContain("gone");
  });

  /**
   * Info: (20260811 - Luphia) 行程還活著但心跳停了：不搶。
   * 搶了會變成兩個 worker 跑同一個 mission——比多等一會兒嚴重得多。
   */
  it("同機但持有行程仍存活時不得接手", () => {
    const verdict = evaluateMissionLock(
      record({
        pid: process.pid,
        heartbeat: NOW - MISSION_LOCK_STALE_AFTER_MS - 1,
      }),
      NOW,
    );

    expect(verdict.reclaimable).toBe(false);
    expect(verdict.reason).toContain("alive");
  });

  // Info: (20260811 - Luphia) 跨機器無法驗證 pid，只能等硬性上限——保底而非常態路徑
  it("其他主機持有時等硬性上限", () => {
    const stale = record({
      hostname: "some-other-host",
      heartbeat: NOW - MISSION_LOCK_STALE_AFTER_MS - 1,
    });

    expect(evaluateMissionLock(stale, NOW).reclaimable).toBe(false);
    expect(
      evaluateMissionLock(stale, NOW + MISSION_LOCK_HARD_EXPIRY_MS).reclaimable,
    ).toBe(true);
  });

  /**
   * Info: (20260811 - Luphia) 舊版格式一過期就可接手。
   * 依據是：會寫出那個格式的只有舊版程式碼，新版既然在跑，那個行程必然已被重啟。
   * 這條讓升級後既有的孤兒鎖立刻解除，而不是再等一小時。
   */
  it("legacy 鎖過期後立刻可接手", () => {
    const verdict = evaluateMissionLock(
      { ...record({ pid: 0, hostname: "" }), legacy: true },
      NOW + MISSION_LOCK_STALE_AFTER_MS + 1,
    );

    expect(verdict.reclaimable).toBe(true);
    expect(verdict.reason).toContain("legacy");
  });

  // Info: (20260811 - Luphia) legacy 但還在容忍窗內時仍不得接手，避免誤判正在執行的舊 worker
  it("legacy 鎖在容忍窗內不得接手", () => {
    const verdict = evaluateMissionLock(
      { ...record({ pid: 0, hostname: "" }), legacy: true },
      NOW + 1_000,
    );

    expect(verdict.reclaimable).toBe(false);
  });

  /**
   * Info: (20260811 - Luphia) 回收窗口必須遠短於舊版的一小時，否則這次修正等於沒做。
   * 用不等式而非硬編數字，讓調參時測試仍然表達原意。
   */
  it("死亡行程的回收窗口遠短於硬性上限", () => {
    expect(MISSION_LOCK_STALE_AFTER_MS).toBeLessThan(
      MISSION_LOCK_HARD_EXPIRY_MS / 10,
    );
  });
});
