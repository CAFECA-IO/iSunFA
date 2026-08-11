import {
  heldMissionLockCount,
  releaseHeldMissionLocksSync,
} from "@/lib/worker/mission_lock";

/**
 * Info: (20260811 - Luphia) Worker 行程的關機協調。
 *
 * ── 為什麼需要它 ──
 * mission 執行鎖是靠檔案存在與否表示的，正常路徑由 `finally` 刪除。但行程被中斷時
 * `finally` 不一定跑得到，鎖就留在原地變成孤兒——20260811 的 mission 288 就是這樣停擺的。
 * heartbeat 機制讓孤兒鎖在一分半內可被接手（見 mission_lock），這裡處理的是另一半：
 * **凡是攔得到的結束路徑，就主動把鎖清掉**，連那一分半都不必等。
 *
 * ── 兩段式中斷是刻意的 ──
 * 第一次 SIGINT / SIGTERM 只設旗標，讓迴圈跑完手上這一件事再退出——此時鎖仍在使用中，
 * 提前釋放會讓另一個 worker 接手同一個 mission，變成重複執行、重複花 token、重複送出。
 * 第二次訊號才視為「不等了」，同步釋放並立即結束。
 *
 * SIGKILL 與斷電攔不到，那正是 heartbeat 存在的理由。
 */

let shuttingDown = false;
let handlersInstalled = false;

export function isShuttingDown(): boolean {
  return shuttingDown;
}

function forceRelease(reason: string): void {
  const count = heldMissionLockCount();
  if (count > 0) {
    console.log(
      `[Worker] Releasing ${count} held mission lock(s) before exit (${reason}).`,
    );
  }
  releaseHeldMissionLocksSync();
}

export function installWorkerShutdownHandlers(label: string): void {
  // Info: (20260811 - Luphia) 冪等：多個迴圈共用同一組 handler，避免 MaxListenersExceededWarning
  if (handlersInstalled) return;
  handlersInstalled = true;

  const onSignal = (signal: string) => {
    if (!shuttingDown) {
      shuttingDown = true;
      console.log(
        `\n[${label}] Received ${signal}. Finishing current work, then stopping. Press again to force.`,
      );
      return;
    }

    forceRelease(`forced by second ${signal}`);
    process.exit(130);
  };

  process.on("SIGINT", () => onSignal("SIGINT"));
  process.on("SIGTERM", () => onSignal("SIGTERM"));

  /**
   * Info: (20260811 - Luphia) 未捕捉的錯誤同樣會讓 finally 沒有機會執行。
   * 這裡刻意不試圖繼續執行——狀態已不可信，釋放鎖之後結束，讓下一輪重新開始。
   */
  process.on("uncaughtException", (error) => {
    console.error(`[${label}] Uncaught exception:`, error);
    forceRelease("uncaughtException");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error(`[${label}] Unhandled rejection:`, reason);
    forceRelease("unhandledRejection");
    process.exit(1);
  });

  // Info: (20260811 - Luphia) 最後一道：任何走到 exit 的路徑都不留下鎖。只能做同步操作。
  process.on("exit", () => {
    releaseHeldMissionLocksSync();
  });
}
