import { describe, it, expect, beforeEach } from "@jest/globals";
import { Prisma } from "@/generated";
import { LeaveLedgerEntryType } from "@/constants/leave_policy";
import {
  readConsumableGrants,
  sumLedgerMinutes,
  writeBalance,
  writeConsumeForDays,
  writeRestoreForDay,
} from "@/repositories/leave_ledger";

/**
 * Info: (20260819 - Julian) T6：額度帳本的守恆（ADR 022 §4）。
 *
 * ## 這條紅線守的是什麼
 *
 * ADR 022 選擇「帳本是真相、`LeaveBalance` 只是快取」。那個決定換來的是
 * 每一分鐘額度都說得出它從哪來、到哪去 —— 代價是**兩份數字必須永遠相等**。
 * 一旦快取與帳本開始分歧，畫面上會出現一個看起來正常的餘額，
 * 而它與逐筆明細加起來的數字不一樣。那種錯誤沒有例外訊息，
 * 只有在某個人請假被擋下、或多請了半天之後才會被發現。
 *
 * ADR 022:175 稱它為「本模組的紅線之一」，要求驗四件事：
 * 逐批守恆、總量守恆、`rebuildBalance` 冪等、重建結果與快取逐欄相同。
 *
 * ## 它先前不存在（review B8）
 *
 * 計畫書 §16 把 T6 與 T19 並列為「本模組的兩條紅線」，而兩支都沒有寫。
 * 這是第一件要修的事：一條沒有測試的紅線只是一句話。
 *
 * ## 為什麼用記憶體替身而不是真的 PostgreSQL
 *
 * 守恆是**這幾支函式之間**的性質，不是 PostgreSQL 的性質：
 * `writeConsumeForDays` 寫幾筆分錄、`writeRestoreForDay` 退回哪幾批、
 * `sumLedgerMinutes` 怎麼加總 —— 錯都錯在這裡，而不是在資料庫。
 * 替身讓這條紅線在 CI 上每次都跑得到；跑不到的紅線與沒有紅線是同一件事。
 *
 * 替身**不**模擬的東西也要說清楚：`idempotencyKey` 的唯一索引在這裡是
 * 手工比對（真實環境靠 DB 的唯一鍵），而列鎖與交易隔離完全沒有模擬。
 * 併發那一條是 T10 的事，且它需要真的資料庫（見 §16 的狀態欄）。
 *
 * Info: (20260819 - Julian) `sumLedgerMinutes` / `writeBalance` 為此從
 * `leave_grant.repo.ts` 搬到 `leave_ledger.ts` —— 前者 import `@/lib/prisma`，
 * 而那一支在載入時就建出吃 `DATABASE_URL` 的 `PrismaClient`。
 * 一條因為環境變數而跑不起來的紅線，與沒有紅線是同一件事。
 */

interface IGrantRow {
  id: string;
  accountBookId: string;
  employeeId: string;
  leavePolicyId: string;
  expiresOn: string;
  createdAt: Date;
}

interface IEntryRow {
  id: string;
  leaveGrantId: string;
  entryType: LeaveLedgerEntryType;
  deltaMinutes: number;
  grantBalanceAfterMinutes: number;
  leaveDayId: string | null;
  idempotencyKey: string;
}

interface IBalanceRow {
  accountBookId: string;
  employeeId: string;
  leavePolicyId: string;
  remainingMinutes: number;
  reconciledAt: Date | null;
}

const BOOK = "book-1";
const EMP = "emp-1";
const POLICY = "policy-annual";
const ACTOR = "emp-hr";

/**
 * Info: (20260819 - Julian) 只實作被測程式真正呼叫到的那幾支。
 *
 * 不做成通用的 Prisma 模擬 —— 一個「幾乎完整」的替身會讓人以為
 * 沒有被測到的行為也被測到了，而那比一個明顯不完整的替身更危險。
 * 這裡少了任何一支，被測程式會當場 `TypeError`，不會安靜地跳過。
 */
class InMemoryLedger {
  public grants: IGrantRow[] = [];
  public entries: IEntryRow[] = [];
  public balances: IBalanceRow[] = [];
  private sequence = 0;

  public addGrant(row: Omit<IGrantRow, "accountBookId" | "employeeId" | "leavePolicyId">, minutes: number): void {
    const grant: IGrantRow = {
      ...row,
      accountBookId: BOOK,
      employeeId: EMP,
      leavePolicyId: POLICY,
    };
    this.grants.push(grant);
    this.entries.push({
      id: `entry-${(this.sequence += 1)}`,
      leaveGrantId: grant.id,
      entryType: LeaveLedgerEntryType.GRANT,
      deltaMinutes: minutes,
      grantBalanceAfterMinutes: minutes,
      leaveDayId: null,
      idempotencyKey: `grant:${grant.id}`,
    });
  }

  private sumByGrant(ids: readonly string[]): Map<string, number> {
    const totals = new Map<string, number>();
    for (const entry of this.entries) {
      if (!ids.includes(entry.leaveGrantId)) continue;
      totals.set(
        entry.leaveGrantId,
        (totals.get(entry.leaveGrantId) ?? 0) + entry.deltaMinutes,
      );
    }
    return totals;
  }

  /**
   * Info: (20260819 - Julian) 全部用箭頭函式，因此 `this` 直接沿用 getter 的
   * 詞法繫結 —— 不需要 `const self = this`（`no-this-alias`）。
   */
  public get client(): Prisma.TransactionClient {
    return {
      leaveGrant: {
        findMany: async (args: {
          where: {
            accountBookId?: string;
            employeeId?: string;
            leavePolicyId?: string;
            expiresOn?: { gte: string };
          };
        }) =>
          this.grants.filter((grant) => {
            const where = args.where;
            if (where.accountBookId && grant.accountBookId !== where.accountBookId) return false;
            if (where.employeeId && grant.employeeId !== where.employeeId) return false;
            if (where.leavePolicyId && grant.leavePolicyId !== where.leavePolicyId) return false;
            if (where.expiresOn && grant.expiresOn < where.expiresOn.gte) return false;
            return true;
          }),
      },
      leaveLedgerEntry: {
        groupBy: async (args: { where: { leaveGrantId: { in: string[] } } }) =>
          [...this.sumByGrant(args.where.leaveGrantId.in)].map(
            ([leaveGrantId, sum]) => ({
              leaveGrantId,
              _sum: { deltaMinutes: sum },
            }),
          ),
        aggregate: async (args: { where: { leaveGrantId: { in: string[] } } }) => {
          let total = 0;
          for (const value of this.sumByGrant(args.where.leaveGrantId.in).values()) {
            total += value;
          }
          return { _sum: { deltaMinutes: total } };
        },
        findMany: async (args: {
          where: { leaveDayId?: string; entryType?: LeaveLedgerEntryType };
        }) =>
          this.entries.filter(
            (entry) =>
              (args.where.leaveDayId === undefined ||
                entry.leaveDayId === args.where.leaveDayId) &&
              (args.where.entryType === undefined ||
                entry.entryType === args.where.entryType),
          ),
        create: async (args: { data: Omit<IEntryRow, "id"> }) => {
          /**
           * Info: (20260819 - Julian) 手工模擬 `idempotencyKey` 的唯一索引。
           * 真實環境是 DB 擋（P2002）；這裡若不擋，重跑會安靜地重複入帳，
           * 而那正是這支測試要證明不會發生的事。
           */
          if (
            this.entries.some(
              (entry) => entry.idempotencyKey === args.data.idempotencyKey,
            )
          ) {
            throw new Error(
              `Unique constraint failed: idempotencyKey=${args.data.idempotencyKey}`,
            );
          }
          const row: IEntryRow = { id: `entry-${(this.sequence += 1)}`, ...args.data };
          this.entries.push(row);
          return row;
        },
      },
      leaveBalance: {
        upsert: async (args: {
          where: { employeeId_leavePolicyId: { employeeId: string; leavePolicyId: string } };
          create: IBalanceRow;
          update: { remainingMinutes: number; reconciledAt?: Date };
        }) => {
          const key = args.where.employeeId_leavePolicyId;
          const existing = this.balances.find(
            (row) =>
              row.employeeId === key.employeeId &&
              row.leavePolicyId === key.leavePolicyId,
          );
          if (existing === undefined) {
            this.balances.push({ ...args.create });
            return args.create;
          }
          existing.remainingMinutes = args.update.remainingMinutes;
          if (args.update.reconciledAt) existing.reconciledAt = args.update.reconciledAt;
          return existing;
        },
      },
    } as unknown as Prisma.TransactionClient;
  }
}

const SCOPE = { accountBookId: BOOK, employeeId: EMP, leavePolicyId: POLICY };
const AS_OF = "2026-08-19";
const RECONCILED_AT = new Date("2026-08-19T00:00:00.000Z");

let ledger: InMemoryLedger;

const rebuild = async (): Promise<number> => {
  const remainingMinutes = await sumLedgerMinutes(ledger.client, SCOPE);
  await writeBalance(ledger.client, {
    ...SCOPE,
    remainingMinutes,
    reconciledAt: RECONCILED_AT,
  });
  return remainingMinutes;
};

const balanceRow = (): IBalanceRow | undefined => ledger.balances[0];

/** Info: (20260819 - Julian) 逐批餘額 = 該批所有分錄之和（GRANT 本身也是一筆正的異動） */
const perGrantBalances = (): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const grant of ledger.grants) totals.set(grant.id, 0);
  for (const entry of ledger.entries) {
    totals.set(
      entry.leaveGrantId,
      (totals.get(entry.leaveGrantId) ?? 0) + entry.deltaMinutes,
    );
  }
  return totals;
};

beforeEach(async () => {
  ledger = new InMemoryLedger();
  // Info: (20260819 - Julian) 兩批：先到期的 480 分、後到期的 960 分
  ledger.addGrant(
    { id: "grant-early", expiresOn: "2026-12-31", createdAt: new Date("2026-01-01T00:00:00.000Z") },
    480,
  );
  ledger.addGrant(
    { id: "grant-late", expiresOn: "2027-12-31", createdAt: new Date("2026-07-01T00:00:00.000Z") },
    960,
  );
  await rebuild();
});

describe("T6 逐批守恆：每一批的餘額等於它自己的分錄之和", () => {
  it("跨批次扣減之後，兩批各自對得起來", async () => {
    const balances = await readConsumableGrants(ledger.client, { ...SCOPE, asOfDate: AS_OF });
    // Info: (20260819 - Julian) 600 分 > 先到期那批的 480 → 必然跨批
    const ok = await writeConsumeForDays(ledger.client, {
      balances,
      days: [{ leaveDayId: "day-1", minutes: 600 }],
      actorEmployeeId: ACTOR,
    });
    expect(ok).toBe(true);

    const perGrant = perGrantBalances();
    expect(perGrant.get("grant-early")).toBe(0);
    expect(perGrant.get("grant-late")).toBe(960 - 120);

    /**
     * Info: (20260819 - Julian) `grantBalanceAfterMinutes` 也必須對得起來。
     * 它的全部用途是勾稽時定位斷點 —— 一欄說謊的「扣完剩多少」
     * 會讓對帳的人在正確的那一批上找錯誤。
     */
    for (const grant of ledger.grants) {
      let running = 0;
      for (const entry of ledger.entries.filter((row) => row.leaveGrantId === grant.id)) {
        running += entry.deltaMinutes;
        expect(entry.grantBalanceAfterMinutes).toBe(running);
      }
    }
  });

  it("額度不足時回 false，且**一筆分錄都不留**", async () => {
    const before = ledger.entries.length;
    const balances = await readConsumableGrants(ledger.client, { ...SCOPE, asOfDate: AS_OF });
    const ok = await writeConsumeForDays(ledger.client, {
      balances,
      days: [{ leaveDayId: "day-x", minutes: 2000 }],
      actorEmployeeId: ACTOR,
    });
    expect(ok).toBe(false);
    expect(ledger.entries.length).toBe(before);
  });
});

describe("T6 總量守恆：Σ(deltaMinutes) === LeaveBalance.remainingMinutes", () => {
  it("授予、扣減、回補之後總量仍然相等", async () => {
    const balances = await readConsumableGrants(ledger.client, { ...SCOPE, asOfDate: AS_OF });
    await writeConsumeForDays(ledger.client, {
      balances,
      days: [
        { leaveDayId: "day-1", minutes: 480 },
        { leaveDayId: "day-2", minutes: 240 },
      ],
      actorEmployeeId: ACTOR,
    });
    await rebuild();
    expect(balanceRow()?.remainingMinutes).toBe(1440 - 720);

    const restored = await writeRestoreForDay(ledger.client, {
      leaveDayId: "day-2",
      actorEmployeeId: ACTOR,
      reason: "銷假",
    });
    expect(restored).toBe(240);
    await rebuild();

    const total = ledger.entries.reduce((sum, entry) => sum + entry.deltaMinutes, 0);
    expect(balanceRow()?.remainingMinutes).toBe(total);
    expect(total).toBe(1440 - 480);
  });

  /**
   * Info: (20260819 - Julian) 回補必須回到**當初扣的那幾批**。
   *
   * 重新跑一次分配會依「先到期先扣」把額度退給另一批 —— 總數對得起來，
   * 但某一批被退了它從未被扣的量。那種錯誤在總額勾稽時完全看不出來，
   * 所以這裡逐批比對而不是只看總數。
   */
  it("回補退回原批，不是重新分配", async () => {
    const balances = await readConsumableGrants(ledger.client, { ...SCOPE, asOfDate: AS_OF });
    await writeConsumeForDays(ledger.client, {
      balances,
      days: [{ leaveDayId: "day-1", minutes: 600 }],
      actorEmployeeId: ACTOR,
    });
    await writeRestoreForDay(ledger.client, {
      leaveDayId: "day-1",
      actorEmployeeId: ACTOR,
      reason: "銷假",
    });

    const perGrant = perGrantBalances();
    expect(perGrant.get("grant-early")).toBe(480);
    expect(perGrant.get("grant-late")).toBe(960);
  });

  it("那一天根本沒有 CONSUME 時回 0，不是「應該回補多少」", async () => {
    const restored = await writeRestoreForDay(ledger.client, {
      leaveDayId: "day-never-consumed",
      actorEmployeeId: ACTOR,
      reason: "銷假",
    });
    expect(restored).toBe(0);
  });
});

describe("T6 rebuild 冪等，且重建結果與快取逐欄相同", () => {
  it("連跑三次結果相同，快取也不會漂移", async () => {
    const balances = await readConsumableGrants(ledger.client, { ...SCOPE, asOfDate: AS_OF });
    await writeConsumeForDays(ledger.client, {
      balances,
      days: [{ leaveDayId: "day-1", minutes: 300 }],
      actorEmployeeId: ACTOR,
    });

    const first = await rebuild();
    const second = await rebuild();
    const third = await rebuild();
    expect([second, third]).toEqual([first, first]);
    expect(ledger.balances).toHaveLength(1);
    expect(balanceRow()?.remainingMinutes).toBe(first);
    expect(balanceRow()?.reconciledAt).toEqual(RECONCILED_AT);
  });

  /**
   * Info: (20260819 - Julian) **帳本是對的那一個。**
   *
   * 把快取手動改壞，重建必須把它蓋回去而不是報錯了事 ——
   * 這是 ADR 022 §4 第二條規矩的全部意思。
   */
  it("快取被改壞時，重建直接以帳本覆寫", async () => {
    const row = balanceRow();
    expect(row).toBeDefined();
    if (row === undefined) return;
    row.remainingMinutes = 99999;

    const rebuilt = await rebuild();
    expect(rebuilt).toBe(1440);
    expect(balanceRow()?.remainingMinutes).toBe(1440);
  });

  /**
   * Info: (20260819 - Julian) 同一天同一批只能扣一次。
   *
   * 冪等鍵是 `consume:<日>:<批次>`，唯一索引是最終防線。重跑同一天
   * 必須撞上它 —— 若安靜地成立，那一天會被扣兩次，而總量守恆仍然成立
   * （帳本與快取一起錯），這是唯一一種守恆式檢查不出來的錯法。
   */
  it("同一天重跑會撞上冪等鍵，不會重複入帳", async () => {
    const balances = await readConsumableGrants(ledger.client, { ...SCOPE, asOfDate: AS_OF });
    await writeConsumeForDays(ledger.client, {
      balances,
      days: [{ leaveDayId: "day-1", minutes: 240 }],
      actorEmployeeId: ACTOR,
    });
    const afterFirst = ledger.entries.length;

    const fresh = await readConsumableGrants(ledger.client, { ...SCOPE, asOfDate: AS_OF });
    await expect(
      writeConsumeForDays(ledger.client, {
        balances: fresh,
        days: [{ leaveDayId: "day-1", minutes: 240 }],
        actorEmployeeId: ACTOR,
      }),
    ).rejects.toThrow(/idempotencyKey/);
    expect(ledger.entries.length).toBe(afterFirst);
  });

  /**
   * Info: (20260819 - Julian) 已過期的批次不參與 FIFO，但它的分錄仍在帳上。
   *
   * 兩件事都要成立：`readConsumableGrants` 看不到它（不能拿來扣），
   * 而 `sumLedgerMinutes` 仍然把它算進去（帳本記的是歷史，不是可用量）。
   * 這一條把「可用餘額」與「帳本總和」的差別釘住 ——
   * 兩者被誤當成同一個數字時，過期額度會在餘額卡上復活。
   */
  it("過期批次不可扣，但仍留在帳本總和裡", async () => {
    ledger.addGrant(
      { id: "grant-expired", expiresOn: "2026-01-31", createdAt: new Date("2025-01-01T00:00:00.000Z") },
      120,
    );

    const consumable = await readConsumableGrants(ledger.client, { ...SCOPE, asOfDate: AS_OF });
    expect(consumable.map((item) => item.grantId)).toEqual([
      "grant-early",
      "grant-late",
    ]);

    expect(await sumLedgerMinutes(ledger.client, SCOPE)).toBe(1440 + 120);
  });
});
