/**
 * Info: (20261015 - Luphia) 背景 worker 租約（`WorkerLease`）的常數。見 `services/worker_lease.service.ts`。
 */

// Info: (20261015 - Luphia) 背景 worker（scripts/run_worker.ts）共用的租約名稱
export const BACKGROUND_WORKER_LEASE = "background-worker";

/**
 * Info: (20261015 - Luphia) 租約時效與心跳間隔。
 * TTL 取心跳的三倍：容忍兩次心跳因 DB 抖動失敗而不被誤判為死亡；
 * 代價是持有者真的掛掉時，待命者最多要等 TTL 才接手。
 */
export const WORKER_LEASE_TTL_MS = 90 * 1000;
export const WORKER_LEASE_HEARTBEAT_MS = 30 * 1000;
// Info: (20261015 - Luphia) 待命者多久試一次接手
export const WORKER_LEASE_STANDBY_POLL_MS = 30 * 1000;

export const WORKER_LEASE_OUTCOME = {
  ACQUIRED: "ACQUIRED",
  HELD_BY_OTHER: "HELD_BY_OTHER",
} as const;

export type WorkerLeaseOutcome =
  (typeof WORKER_LEASE_OUTCOME)[keyof typeof WORKER_LEASE_OUTCOME];
