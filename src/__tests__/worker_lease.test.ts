import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

/**
 * Info: (20261015 - Luphia) 背景 worker 租約：同一個資料庫只有一個 worker 在跑迴圈。
 *
 * 以記憶體模擬 `worker_lease` 這一列，照 Prisma updateMany 的條件語意實作，
 * 釘住三件事：沒人持有時搶得到、有人持有且未過期時搶不到、持有者過期後被接手，
 * 以及被接手的那一方心跳會發現自己已經失去租約。
 */

interface ILeaseRow {
  name: string;
  holderId: string;
  expiresAt: Date;
}

const rows = new Map<string, ILeaseRow>();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workerLease: {
      updateMany: jest.fn(
        async (args: {
          where: {
            name: string;
            holderId?: string;
            OR?: ({ holderId: string } | { expiresAt: { lt: Date } })[];
          };
          data: Partial<ILeaseRow>;
        }) => {
          const row = rows.get(args.where.name);
          if (!row) return { count: 0 };
          if (args.where.holderId && row.holderId !== args.where.holderId) {
            return { count: 0 };
          }
          if (args.where.OR) {
            const match = args.where.OR.some((cond) =>
              "holderId" in cond
                ? row.holderId === cond.holderId
                : row.expiresAt < cond.expiresAt.lt,
            );
            if (!match) return { count: 0 };
          }
          Object.assign(row, args.data);
          return { count: 1 };
        },
      ),
      findUnique: jest.fn(
        async (args: { where: { name: string } }) =>
          rows.get(args.where.name) ?? null,
      ),
      create: jest.fn(async (args: { data: ILeaseRow }) => {
        rows.set(args.data.name, { ...args.data });
        return args.data;
      }),
    },
  },
}));

import {
  releaseWorkerLease,
  startWorkerLeaseHeartbeat,
  tryAcquireWorkerLease,
} from "@/services/worker_lease.service";
import {
  WORKER_LEASE_HEARTBEAT_MS,
  WORKER_LEASE_OUTCOME,
  WORKER_LEASE_TTL_MS,
} from "@/constants/worker_lease";

const NAME = "background-worker";
const T0 = Date.parse("2026-10-15T00:00:00Z");

beforeEach(() => {
  rows.clear();
});

describe("tryAcquireWorkerLease", () => {
  it("沒有人持有時搶得到（第一次建立那一列）", async () => {
    await expect(
      tryAcquireWorkerLease({ name: NAME, holderId: "a", nowMs: T0 }),
    ).resolves.toBe(WORKER_LEASE_OUTCOME.ACQUIRED);
    expect(rows.get(NAME)?.holderId).toBe("a");
  });

  it("別人持有且未過期時搶不到", async () => {
    await tryAcquireWorkerLease({ name: NAME, holderId: "a", nowMs: T0 });
    await expect(
      tryAcquireWorkerLease({ name: NAME, holderId: "b", nowMs: T0 + 1000 }),
    ).resolves.toBe(WORKER_LEASE_OUTCOME.HELD_BY_OTHER);
    expect(rows.get(NAME)?.holderId).toBe("a");
  });

  it("持有者過期後由待命者接手", async () => {
    await tryAcquireWorkerLease({ name: NAME, holderId: "a", nowMs: T0 });
    await expect(
      tryAcquireWorkerLease({
        name: NAME,
        holderId: "b",
        nowMs: T0 + WORKER_LEASE_TTL_MS + 1,
      }),
    ).resolves.toBe(WORKER_LEASE_OUTCOME.ACQUIRED);
    expect(rows.get(NAME)?.holderId).toBe("b");
  });

  it("正常放手後待命者立即接手，不必等 TTL", async () => {
    await tryAcquireWorkerLease({ name: NAME, holderId: "a", nowMs: T0 });
    await releaseWorkerLease({ name: NAME, holderId: "a" });
    await expect(
      tryAcquireWorkerLease({ name: NAME, holderId: "b", nowMs: T0 + 1000 }),
    ).resolves.toBe(WORKER_LEASE_OUTCOME.ACQUIRED);
  });
});

describe("startWorkerLeaseHeartbeat", () => {
  it("被接手的一方在下一次心跳發現並收尾", async () => {
    jest.useFakeTimers();
    try {
      await tryAcquireWorkerLease({ name: NAME, holderId: "a", nowMs: T0 });
      const onLost = jest.fn();
      const stop = startWorkerLeaseHeartbeat({
        name: NAME,
        holderId: "a",
        onLost,
        log: () => undefined,
      });

      // Info: (20261015 - Luphia) 模擬 a 斷線太久、b 接手
      rows.set(NAME, {
        name: NAME,
        holderId: "b",
        expiresAt: new Date(T0 + WORKER_LEASE_TTL_MS * 2),
      });

      await jest.advanceTimersByTimeAsync(WORKER_LEASE_HEARTBEAT_MS);
      expect(onLost).toHaveBeenCalledTimes(1);
      stop();
    } finally {
      jest.useRealTimers();
    }
  });
});
