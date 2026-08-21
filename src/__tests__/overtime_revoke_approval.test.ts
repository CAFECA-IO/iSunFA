import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

/**
 * Info: (20260821 - Julian) 撤銷核准的**補休那一條路徑**與它的邊界
 * （review 第 7 輪 B1）。
 *
 * `overtime_same_day_reachability.test.ts` 走完整條可達序列，但一律
 * `PAYMENT` —— 那條路只要還原分段與折現事件。選補休的單子多三樣：
 * 額度批次、`GRANT` 分錄、餘額快取，而且它有一個 `PAYMENT` 沒有的邊界：
 *
 * **補休一旦被請掉、過期或折現，核准就不能再撤銷了。**
 * 撤銷等於憑空消滅一筆已經被使用的權益。
 *
 * ## 那道邊界真正的執行者是外鍵，不是這裡的預檢
 *
 * `LeaveLedgerEntry.leaveGrant` 是 `onDelete: Restrict`，所以「刪得掉批次」
 * 與「這批補休沒有被動過」是同一件事。repository 裡那次 `count` 只是為了
 * 給出一句說得出下一步的訊息（找人資做人工調整，而不是重按）。
 * 這一支因此**兩件都測**：預檢擋下時回哪個碼，以及預檢被繞過時外鍵擋不擋。
 */

const BOOK = "book-1";
const REQUEST = "ot-1";
const POLICY = "policy-comp";

interface IRow {
  [key: string]: unknown;
}

let requestStatus = "APPROVED";
let segments: IRow[] = [];
let grants: IRow[] = [];
let entries: IRow[] = [];
let cashOuts: IRow[] = [];
let balances: IRow[] = [];

/** Info: (20260821 - Julian) 為真時，預檢跑完之後才注入一筆扣減（模擬競態） */
let raceEntryAfterPrecheck = false;

/**
 * Info: (20260821 - Julian) 外鍵 `onDelete: Restrict` 由替身**模擬**。
 *
 * 少了它，「預檢被繞過時外鍵會擋」那一條就沒有任何東西在驗 ——
 * 而那正是 review 指出的那種「宣稱有保護、其實沒有」。這裡不是完整的
 * 參照完整性引擎：只實作被斷言的那一條規則，撞到就丟，
 * 訊息形狀比照 Prisma 的 P2003。
 */
const RESTRICT_MESSAGE =
  "Foreign key constraint violated on the constraint: `leave_ledger_entry_leave_grant_id_fkey`";

jest.mock("@/lib/prisma", () => {
  const client = {
    overtimeRequest: {
      updateMany: jest.fn(async ({ where }: { where: { status?: string } }) => {
        if (where.status !== requestStatus) return { count: 0 };
        requestStatus = "PENDING";
        return { count: 1 };
      }),
    },
    overtimeSegment: {
      findMany: jest.fn(async () => segments),
      deleteMany: jest.fn(async () => {
        const count = segments.length;
        segments = [];
        return { count };
      }),
    },
    leaveGrant: {
      findMany: jest.fn(async () => grants),
      deleteMany: jest.fn(
        async ({ where }: { where: { id: { in: string[] } } }) => {
          const doomed = new Set(where.id.in);
          const blocking = entries.filter((entry) =>
            doomed.has(entry.leaveGrantId as string),
          );
          if (blocking.length > 0) throw new Error(RESTRICT_MESSAGE);
          const keep = grants.filter(
            (grant) => !doomed.has(grant.id as string),
          );
          const count = grants.length - keep.length;
          grants = keep;
          return { count };
        },
      ),
    },
    leaveLedgerEntry: {
      count: jest.fn(
        async ({ where }: { where: { entryType?: { not?: string } } }) => {
          const hits = entries.filter((entry) =>
            where.entryType?.not === undefined
              ? true
              : entry.entryType !== where.entryType.not,
          ).length;
          /**
           * Info: (20260821 - Julian) 預檢**之後**才落地的那一次扣減。
           *
           * 這是模擬競態唯一誠實的位置：`raceEntryAfterPrecheck` 為真時，
           * 預檢照樣回 0（此刻它還不存在），而 `leaveGrant.deleteMany`
           * 執行時它已經在了。
           */
          if (raceEntryAfterPrecheck) {
            raceEntryAfterPrecheck = false;
            entries.push({
              id: "entry-race",
              leaveGrantId: "grant-1",
              entryType: LeaveLedgerEntryType.CONSUME,
              deltaMinutes: -60,
            });
          }
          return hits;
        },
      ),
      deleteMany: jest.fn(
        async ({
          where,
        }: {
          where: { leaveGrantId: { in: string[] }; entryType?: string };
        }) => {
          const doomed = new Set(where.leaveGrantId.in);
          /**
           * Info: (20260821 - Julian) `entryType` 這個條件**必須被尊重**。
           *
           * 忽略它的替身會把競態進來的扣減也刪掉，於是下面那條
           * 「外鍵擋得住」的測試永遠綠 —— 而它要驗的正是那一列有沒有留下來。
           */
          const keep = entries.filter(
            (entry) =>
              !doomed.has(entry.leaveGrantId as string) ||
              (where.entryType !== undefined &&
                entry.entryType !== where.entryType),
          );
          const count = entries.length - keep.length;
          entries = keep;
          return { count };
        },
      ),
      aggregate: jest.fn(async () => ({
        _sum: {
          deltaMinutes: entries.reduce(
            (total, entry) => total + ((entry.deltaMinutes as number) ?? 0),
            0,
          ),
        },
      })),
    },
    leaveCashOutEvent: {
      count: jest.fn(
        async () => cashOuts.filter((one) => one.settledAt !== null).length,
      ),
      deleteMany: jest.fn(async () => {
        const count = cashOuts.length;
        cashOuts = [];
        return { count };
      }),
    },
    leaveBalance: {
      upsert: jest.fn(async ({ update }: { update: IRow }) => {
        balances = [{ ...(balances[0] ?? {}), ...update }];
        return balances[0];
      }),
    },
    $transaction: jest.fn(async (run: (tx: unknown) => Promise<unknown>) =>
      run(client),
    ),
  };
  return { prisma: client };
});

import { overtimeRequestRepo } from "@/repositories/overtime_request.repo";
import { OvertimeApprovalNotReversibleError } from "@/repositories/overtime_request.repo";
import { OvertimeDecisionOutcome } from "@/interfaces/overtime";
import { LeaveLedgerEntryType } from "@/constants/leave_policy";

const revoke = () =>
  overtimeRequestRepo.revokeApproval({
    accountBookId: BOOK,
    requestId: REQUEST,
  });

beforeEach(() => {
  requestStatus = "APPROVED";
  segments = [{ id: "seg-1", overtimeRequestId: REQUEST }];
  grants = [{ id: "grant-1", employeeId: "emp-006", leavePolicyId: POLICY }];
  entries = [
    {
      id: "entry-1",
      leaveGrantId: "grant-1",
      entryType: LeaveLedgerEntryType.GRANT,
      deltaMinutes: 120,
    },
  ];
  cashOuts = [];
  balances = [];
  raceEntryAfterPrecheck = false;
});

describe("撤銷核准：補休那一條路徑", () => {
  it("沒有被動過時，批次、分錄與分段一起還原，餘額重算", async () => {
    await expect(revoke()).resolves.toBe(OvertimeDecisionOutcome.DECIDED);

    expect(grants).toHaveLength(0);
    expect(entries).toHaveLength(0);
    expect(segments).toHaveLength(0);
    // Info: (20260821 - Julian) 餘額回到 0，且是**重算**出來的不是硬寫的
    expect(balances[0]?.remainingMinutes).toBe(0);
  });

  /**
   * Info: (20260821 - Julian) 補休已經被請掉 → 專屬例外，不是一般失敗。
   *
   * 回 `DECIDED` 或丟一個泛用錯誤都會讓畫面說「已撤銷」或「請再試一次」，
   * 而使用者會一直按同一顆按鈕。下一步是人工調整。
   */
  it("補休已被請掉時丟 OvertimeApprovalNotReversibleError", async () => {
    entries.push({
      id: "entry-2",
      leaveGrantId: "grant-1",
      entryType: LeaveLedgerEntryType.CONSUME,
      deltaMinutes: -60,
    });

    await expect(revoke()).rejects.toBeInstanceOf(
      OvertimeApprovalNotReversibleError,
    );
  });

  /**
   * Info: (20260821 - Julian) **預檢通過、刪除當下才出現扣減 → 外鍵擋下。**
   *
   * 這一條驗的是「保護在哪一層」。預檢只是為了給出一句人看得懂的話；
   * 真正的保證是 `LeaveLedgerEntry.leaveGrant` 的 `onDelete: Restrict`。
   *
   * 它同時釘住了一個第一版寫錯的地方：`leaveLedgerEntry.deleteMany` 原本
   * 不帶 `entryType`，會把競態進來的扣減先刪掉，於是外鍵永遠撞不到 ——
   * 一句宣稱有保護、其實沒有的註解。
   */
  it("預檢通過但刪除當下才出現扣減 → 外鍵擋下", async () => {
    raceEntryAfterPrecheck = true;

    await expect(revoke()).rejects.toThrow(/Foreign key constraint/);
    // Info: (20260821 - Julian) 那一筆扣減必須還在 —— 它是外鍵擋得住的原因
    expect(
      entries.some((entry) => entry.entryType === LeaveLedgerEntryType.CONSUME),
    ).toBe(true);
  });

  /**
   * Info: (20260821 - Julian) 折現已由薪資結算 → 同樣不可逆。
   * `settledAt` 非 null 表示那筆錢已經發出去了。
   */
  it("折現已結算時丟 OvertimeApprovalNotReversibleError", async () => {
    grants = [];
    entries = [];
    cashOuts = [
      { id: "cash-1", overtimeSegmentId: "seg-1", settledAt: new Date() },
    ];

    await expect(revoke()).rejects.toBeInstanceOf(
      OvertimeApprovalNotReversibleError,
    );
  });

  /**
   * Info: (20260821 - Julian) 不在 `APPROVED` 時回 `NOT_APPROVED`，不做任何刪除。
   * 判斷由附條件更新做 —— 先讀再判會讓兩個人同時撤銷都通過。
   */
  it("不在已核准時回 NOT_APPROVED，且什麼都不刪", async () => {
    requestStatus = "PENDING";

    await expect(revoke()).resolves.toBe(OvertimeDecisionOutcome.NOT_APPROVED);
    expect(grants).toHaveLength(1);
    expect(segments).toHaveLength(1);
  });
});
