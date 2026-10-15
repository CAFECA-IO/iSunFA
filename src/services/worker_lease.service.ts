import { hostname } from "os";
import { randomUUID } from "crypto";
import {
  WORKER_LEASE_HEARTBEAT_MS,
  WORKER_LEASE_OUTCOME,
  WORKER_LEASE_STANDBY_POLL_MS,
  WORKER_LEASE_TTL_MS,
  WorkerLeaseOutcome,
} from "@/constants/worker_lease";
import { workerLeaseRepo } from "@/repositories/worker_lease.repo";

/**
 * Info: (20261015 - Luphia) 背景 worker 租約：同一個資料庫上同時只有一個 worker 執行迴圈。
 *
 * `npm start` 與 `npm run swarm` 都會連同 worker 一起啟動（scripts/run_server_with_worker.ts），
 * 兩者並存、或再加上 pm2 單獨跑的 worker 時，沒有這道閘就是多個 worker 同時派發同一張訂單。
 *
 * 流程：待命直到搶到租約 → 執行迴圈並每 30 秒心跳 → 心跳發現被接手（例如本機 DB 斷線太久）
 * 就呼叫 `onLost` 讓迴圈收尾退出；正常關機時 `release` 立即放手。
 */

export function createWorkerHolderId(): string {
  return `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
}

export async function tryAcquireWorkerLease(params: {
  name: string;
  holderId: string;
  nowMs: number;
}): Promise<WorkerLeaseOutcome> {
  const acquired = await workerLeaseRepo.tryAcquire({
    name: params.name,
    holderId: params.holderId,
    now: new Date(params.nowMs),
    expiresAt: new Date(params.nowMs + WORKER_LEASE_TTL_MS),
  });
  return acquired
    ? WORKER_LEASE_OUTCOME.ACQUIRED
    : WORKER_LEASE_OUTCOME.HELD_BY_OTHER;
}

/**
 * Info: (20261015 - Luphia) 待命直到搶到租約。`shouldStop` 為 true 時放棄（關機中），回 false。
 */
export async function waitForWorkerLease(params: {
  name: string;
  holderId: string;
  shouldStop: () => boolean;
  log: (message: string) => void;
}): Promise<boolean> {
  let announced = false;
  while (!params.shouldStop()) {
    try {
      const outcome = await tryAcquireWorkerLease({
        name: params.name,
        holderId: params.holderId,
        nowMs: Date.now(),
      });
      if (outcome === WORKER_LEASE_OUTCOME.ACQUIRED) return true;
      if (!announced) {
        params.log(
          "Another worker holds the lease; standing by and will take over if it stops.",
        );
        announced = true;
      }
    } catch (error) {
      params.log(
        `Lease check failed, retrying: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    await new Promise((resolve) =>
      setTimeout(resolve, WORKER_LEASE_STANDBY_POLL_MS),
    );
  }
  return false;
}

/**
 * Info: (20261015 - Luphia) 持有期間的心跳。回傳停止函式。
 * 續約失敗（被接手）即呼叫 `onLost`；DB 暫時連不上不算失去，下一次心跳再試——
 * 真的斷太久，TTL 到期後別人接手，下一次心跳就會發現並收尾。
 */
export function startWorkerLeaseHeartbeat(params: {
  name: string;
  holderId: string;
  onLost: () => void;
  log: (message: string) => void;
}): () => void {
  const timer = setInterval(() => {
    workerLeaseRepo
      .renew({
        name: params.name,
        holderId: params.holderId,
        expiresAt: new Date(Date.now() + WORKER_LEASE_TTL_MS),
      })
      .then((stillHolder) => {
        if (!stillHolder) {
          params.log("Lease was taken over by another worker; stopping.");
          clearInterval(timer);
          params.onLost();
        }
      })
      .catch((error: unknown) => {
        params.log(
          `Lease heartbeat failed, will retry: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }, WORKER_LEASE_HEARTBEAT_MS);
  return () => clearInterval(timer);
}

export async function releaseWorkerLease(params: {
  name: string;
  holderId: string;
}): Promise<void> {
  await workerLeaseRepo.release(params);
}
