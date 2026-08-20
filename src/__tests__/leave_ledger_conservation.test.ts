import { describe, it, expect, beforeEach } from "@jest/globals";
import { Prisma } from "@/generated";
import { LeaveLedgerEntryType } from "@/constants/leave_policy";
import {
  readConsumableGrants,
  rebuildBalanceWithin,
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
 * Info: (20260820 - Julian) 第一版**宣稱驗了四項而三項守不住**（review 第 5 條）。
 *
 * 1. 逐批守恆只套在單日的案例上。唯一有兩天的那條走的是總量，而
 *    `writeConsumeForDays` 少了就地遞減時，帳本與快取會**一起**位移 ——
 *    總量那一行照樣通過，`grant-early` 卻被超額扣了 240。
 *    現在由 `expectLedgerSelfConsistent()` 逐批逐筆守著，每一次寫入之後都跑。
 * 2. `rebuild` 是把產品那一支的本體手抄了一份，而產品那一支全 repo 零呼叫端。
 *    本體因此搬進 `rebuildBalanceWithin`（收 `tx`），這裡呼叫的就是它。
 * 3. `InMemoryLedger.addGrant` 把三個範圍鍵 `Omit` 掉，呼叫端沒有辦法放一筆
 *    屬於別人的批次進來 —— 刪掉 `consumableGrantWhere` 的 `accountBookId:`
 *    不會有任何測試變紅。現在三個鍵都可覆寫，並各有一條測試。
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

/**
 * Info: (20260820 - Julian) 這個替身列必須有**表上的每一欄**（review 第 5 輪第 1 條）。
 *
 * ADR 022 §8.1 對這條紅線的第四項要求是「重建結果與快取**逐欄**相同」，
 * 而第一版的 fixture 只有五欄 —— 缺的正是 `expiringSoonMinutes`，
 * 也正是當時**沒有任何寫入者**的那一欄。於是「重建沒寫它、替身也沒有它」
 * 被讀成「兩邊相同」，而 ADR 上打了一個 ✅（checklist §1.5：
 * 兩邊都是 undefined 的假通過）。
 *
 * 少一欄不是「測得比較少」，是**把缺口凍結成已驗證**。
 */
interface IBalanceRow {
  accountBookId: string;
  employeeId: string;
  leavePolicyId: string;
  remainingMinutes: number;
  expiringSoonMinutes: number;
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

  /**
   * Info: (20260820 - Julian) 三個範圍鍵**可以覆寫**（review 第 5 條）。
   *
   * 原本它們被 `Omit` 掉、一律填成本人本帳本本假別 —— 於是呼叫端根本
   * **沒有辦法**放一筆屬於別人的批次進來，而「範圍過濾有沒有生效」
   * 這個問題就從測試裡消失了：把 `consumableGrantWhere` 的 `accountBookId:`
   * 那一行刪掉，全檔照樣綠。
   */
  public addGrant(
    row: Omit<IGrantRow, "accountBookId" | "employeeId" | "leavePolicyId"> &
      Partial<Pick<IGrantRow, "accountBookId" | "employeeId" | "leavePolicyId">>,
    minutes: number,
  ): void {
    const grant: IGrantRow = {
      ...row,
      accountBookId: row.accountBookId ?? BOOK,
      employeeId: row.employeeId ?? EMP,
      leavePolicyId: row.leavePolicyId ?? POLICY,
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
          update: {
            remainingMinutes: number;
            expiringSoonMinutes?: number;
            reconciledAt?: Date;
          };
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
          /**
           * Info: (20260820 - Julian) 只在 `update` 真的帶了這一欄時才動它
           * —— `writeBalance` 對授予／人工調整那兩條路徑刻意省略它，
           * 而替身若一律寫回 `undefined`，就測不出「省略等於不動」。
           */
          if (args.update.expiringSoonMinutes !== undefined) {
            existing.expiringSoonMinutes = args.update.expiringSoonMinutes;
          }
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

/**
 * Info: (20260820 - Julian) 走**產品那一支**（review 第 5 條）。
 *
 * 這裡原本是把 `leaveGrantRepo.rebuildBalance` 的本體手抄一份
 * （`sumLedgerMinutes` + `writeBalance` 兩行）。於是「rebuild 冪等」
 * 那一組驗的是測試自己抄的副本，而產品那一支全 repo 零呼叫端
 * （勾稽 Worker 還沒寫）—— 兩份實作的任一份被改壞都不會有測試變紅。
 *
 * 本體因此搬到 `rebuildBalanceWithin`（收 `tx`），`rebuildBalance` 只剩
 * `prisma.$transaction` 外殼。這裡呼叫的就是產品在交易內跑的那幾行。
 */
const rebuild = (): Promise<number> =>
  rebuildBalanceWithin(ledger.client, {
    ...SCOPE,
    asOfDate: AS_OF,
    reconciledAt: RECONCILED_AT,
  });

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

/**
 * Info: (20260820 - Julian) 帳本的**自我一致性**（review 第 5 條）。
 *
 * 兩件事，逐批逐筆：
 *
 * 1. 每一筆的 `grantBalanceAfterMinutes` 等於該批到此為止的分錄累加值。
 * 2. 任何一批的餘額都不得為負。
 *
 * ## 為什麼非有不可
 *
 * `writeConsumeForDays` 的檔頭把「就地遞減」點名為關鍵：逐日扣必須看得到
 * 前一天扣完之後的餘額。拿掉那兩行之後，第二天會**再從同一批扣一次**，
 * 而總量守恆完全看不出來 —— 帳本與快取一起位移，
 * `expect(remainingMinutes).toBe(1440 - 720)` 照樣通過、銷假退 240 照樣通過。
 * 那正是這個檔案自己寫下的那句話：「總量守恆仍然成立（帳本與快取一起錯），
 * 這是唯一一種守恆式檢查不出來的錯法」—— 當時只把它套在冪等鍵那一條。
 *
 * 上面兩件事各自抓得到它：`grant-early` 被超額扣掉之後，
 * 第二筆 CONSUME 的 `grantBalanceAfterMinutes`（240，由 `running` 算出）
 * 與實際累加值（-240）對不上，而累加值本身也已經是負的。
 */
const expectLedgerSelfConsistent = (): void => {
  for (const grant of ledger.grants) {
    let running = 0;
    for (const entry of ledger.entries.filter(
      (row) => row.leaveGrantId === grant.id,
    )) {
      running += entry.deltaMinutes;
      expect({
        grantId: grant.id,
        key: entry.idempotencyKey,
        balanceAfter: entry.grantBalanceAfterMinutes,
      }).toEqual({
        grantId: grant.id,
        key: entry.idempotencyKey,
        balanceAfter: running,
      });
    }
    // Info: (20260820 - Julian) 沒有任何一批可以被扣到負的（重複分配的直接症狀）
    expect(running).toBeGreaterThanOrEqual(0);
  }
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
    expectLedgerSelfConsistent();
  });

  /**
   * Info: (20260820 - Julian) **跨日**扣減：第二天必須看得到第一天扣完的餘額（review 第 5 條）。
   *
   * 上面那一條只有一天，因此 `writeConsumeForDays` 的就地遞減對它沒有影響。
   * 這一條是它缺的另一半 —— 480 剛好把先到期那批扣光，第二天的 240
   * 只能落在後到期那批。少了遞減的話，第二天會再從 `grant-early` 扣一次
   * （它在 `running` 裡還是 480），而總量看起來完全正常。
   *
   * 三個斷言缺一不可：逐批的數字、沒有任何一批為負、以及第二天的分錄
   * 真的掛在 `grant-late` 上 —— 只驗前兩者的話，「兩批各扣一半」也會通過。
   */
  it("跨日扣減時，第二天看得到第一天扣完之後的餘額", async () => {
    const balances = await readConsumableGrants(ledger.client, { ...SCOPE, asOfDate: AS_OF });
    const ok = await writeConsumeForDays(ledger.client, {
      balances,
      days: [
        { leaveDayId: "day-1", minutes: 480 },
        { leaveDayId: "day-2", minutes: 240 },
      ],
      actorEmployeeId: ACTOR,
    });
    expect(ok).toBe(true);

    const perGrant = perGrantBalances();
    expect(perGrant.get("grant-early")).toBe(0);
    expect(perGrant.get("grant-late")).toBe(960 - 240);
    expectLedgerSelfConsistent();

    // Info: (20260820 - Julian) 第二天完全落在後到期那批（先到期的已經扣光）
    expect(
      ledger.entries
        .filter((entry) => entry.leaveDayId === "day-2")
        .map((entry) => [entry.leaveGrantId, entry.deltaMinutes]),
    ).toEqual([["grant-late", -240]]);
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
    /**
     * Info: (20260820 - Julian) 總量對不代表逐批對（review 第 5 條）——
     * 重複分配會讓帳本與快取**一起**位移，總量那一行照樣通過。
     */
    expect(perGrantBalances().get("grant-early")).toBe(0);
    expect(perGrantBalances().get("grant-late")).toBe(960 - 240);
    expectLedgerSelfConsistent();

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
    expectLedgerSelfConsistent();
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
    expectLedgerSelfConsistent();
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

/**
 * Info: (20260820 - Julian) 範圍過濾：別人的批次不得混進來（review 第 5 條）。
 *
 * `consumableGrantWhere` 有三個範圍鍵（帳本、員工、假別）與一個到期條件。
 * 這一組先前**測不到**：替身的 `addGrant` 把三個鍵 `Omit` 掉、一律填成
 * 本人本帳本本假別，於是呼叫端沒有辦法放一筆屬於別人的批次進來 ——
 * 刪掉 `accountBookId:` 那一行不會有任何測試變紅，而症狀是
 * 「A 公司的員工扣到 B 公司的額度」。
 *
 * 每一筆外來批次的 `expiresOn` 都刻意設在 `asOfDate` 之後 ——
 * 它被排除的理由必須是那個範圍鍵，不能是「反正它也過期了」。
 */
type IGrantScope = Partial<
  Pick<IGrantRow, "accountBookId" | "employeeId" | "leavePolicyId">
>;

const FOREIGN_CASES: readonly [string, IGrantScope][] = [
  ["別的帳本", { accountBookId: "book-2" }],
  ["別的員工", { employeeId: "emp-2" }],
  ["別的假別", { leavePolicyId: "policy-sick" }],
];

describe("T6 範圍過濾：帳本、員工、假別三個鍵各自都要生效", () => {
  it.each(FOREIGN_CASES)(
    "%s 的批次既不可扣，也不計入本人的帳本總和",
    async (_label, scope) => {
      ledger.addGrant(
        {
          id: "grant-foreign",
          expiresOn: "2028-12-31",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          ...scope,
        },
        720,
      );

      const consumable = await readConsumableGrants(ledger.client, {
        ...SCOPE,
        asOfDate: AS_OF,
      });
      expect(consumable.map((item) => item.grantId)).toEqual([
        "grant-early",
        "grant-late",
      ]);

      // Info: (20260820 - Julian) 720 分沒有進到本人的總和裡
      expect(await sumLedgerMinutes(ledger.client, SCOPE)).toBe(1440);
    },
  );

  /**
   * Info: (20260820 - Julian) 反向的一半：外來批次本身沒有壞掉。
   * 只驗「查不到」的話，一個永遠回空陣列的實作也會通過。
   */
  it("換成那個範圍去查，就查得到它", async () => {
    ledger.addGrant(
      {
        id: "grant-foreign",
        employeeId: "emp-2",
        expiresOn: "2028-12-31",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      720,
    );

    const consumable = await readConsumableGrants(ledger.client, {
      ...SCOPE,
      employeeId: "emp-2",
      asOfDate: AS_OF,
    });
    expect(consumable.map((item) => item.grantId)).toEqual(["grant-foreign"]);
    expect(
      await sumLedgerMinutes(ledger.client, { ...SCOPE, employeeId: "emp-2" }),
    ).toBe(720);
  });

  /**
   * Info: (20260820 - Julian) `asOfDate` 的格式閘（`consumableGrantWhere` 的 fail fast）。
   * 空字串會讓 `expiresOn: { gte: "" }` 比對到每一列 —— 到期過濾靜默失效，
   * 而查詢仍然「成功」。
   */
  it.each(["", "2026-8-19", "2026/08/19"])(
    "asOfDate 格式不對時直接丟（%p）",
    async (asOfDate) => {
      await expect(
        readConsumableGrants(ledger.client, { ...SCOPE, asOfDate }),
      ).rejects.toThrow(/asOfDate/);
    },
  );
});

/**
 * Info: (20260820 - Julian) 第四項要求的另一半：**`expiringSoonMinutes` 也要被重建**
 * （review 第 5 輪第 1 條）。
 *
 * ## 這一欄先前沒有任何寫入者
 *
 * `grep expiringSoonMinutes` 只有讀取點 —— `leave_grant.repo.ts` 把它撈出來
 * 一路送到餘額卡。default 是 0，於是畫面對**每一個人**都顯示
 * 「即將到期 0 分鐘」，包含特休下週就要到期的那一位。
 * 那不是「沒有即將到期的額度」，是「沒有人算過」，而畫面說不出這個差別。
 * §38 IV 未休折現的前置提醒因此從來沒有發生過。
 *
 * ## 而測試把它凍結成正確
 *
 * 上面那個 `IBalanceRow` 原本只有五欄，缺的正是這一欄 —— 於是
 * 「重建沒寫它、替身也沒有它」被讀成「兩邊相同」，
 * 而 ADR 022 §8.1 據此打了一個「四項全驗」的 ✅。
 */
describe("T6 第四項：重建連 expiringSoonMinutes 一起重算", () => {
  /**
   * Info: (20260820 - Julian) 兩批的到期日刻意跨過 30 天的界線：
   * `grant-early` 到期於 2026-12-31（距 `AS_OF` 134 天，不算），
   * 這裡再加一批 20 天後到期的（算）。少了跨界的那一組，
   * 一個「把全部餘額都當成即將到期」的實作也會通過。
   */
  const addExpiringSoon = (): void => {
    ledger.addGrant(
      {
        id: "grant-soon",
        // Info: (20260820 - Julian) AS_OF 是 2026-08-19，30 天內
        expiresOn: "2026-09-08",
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
      },
      300,
    );
  };

  it("只把 30 天內到期的批次算進去", async () => {
    addExpiringSoon();
    await rebuild();

    // Info: (20260820 - Julian) 只有 grant-soon 的 300 分；另兩批分別在 12/31 與次年到期
    expect(balanceRow()?.expiringSoonMinutes).toBe(300);
    expect(balanceRow()?.remainingMinutes).toBe(1440 + 300);
  });

  /**
   * Info: (20260820 - Julian) 扣掉之後即將到期的量要跟著變小 ——
   * 它讀的是**批次餘額**，不是授予當初的面額。
   */
  it("扣過之後即將到期的量跟著減少", async () => {
    addExpiringSoon();
    const balances = await readConsumableGrants(ledger.client, {
      ...SCOPE,
      asOfDate: AS_OF,
    });
    // Info: (20260820 - Julian) FIFO 先扣 grant-soon（它最早到期）
    await writeConsumeForDays(ledger.client, {
      balances,
      days: [{ leaveDayId: "day-1", minutes: 120 }],
      actorEmployeeId: ACTOR,
    });
    await rebuild();

    expect(balanceRow()?.expiringSoonMinutes).toBe(180);
    expectLedgerSelfConsistent();
  });

  /**
   * Info: (20260820 - Julian) 已過期的批次**不算**「即將到期」。
   *
   * 它們不是即將到期，是已經到期 —— 那是 `EXPIRE` 分錄與折現的事
   * （ADR 022 §8.5，Worker 尚未存在）。混進來的話，畫面會催一筆
   * 已經催不回來的額度。
   */
  it("已過期的批次不算即將到期", async () => {
    ledger.addGrant(
      {
        id: "grant-expired",
        expiresOn: "2026-01-31",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      },
      120,
    );
    await rebuild();

    expect(balanceRow()?.expiringSoonMinutes).toBe(0);
    // Info: (20260820 - Julian) 但它仍在帳本總和裡（可用量 ≠ 帳本總和）
    expect(balanceRow()?.remainingMinutes).toBe(1440 + 120);
  });

  /**
   * Info: (20260820 - Julian) 授予與人工調整**不得**把這一欄歸零。
   *
   * 那兩條路徑手上沒有「今天是哪一天」，因此 `writeBalance` 對它們省略
   * 這個參數。省略必須等於「不動」而不是「寫 0」—— 寫 0 的症狀
   * 與「從來沒有人算過」一模一樣，而那正是這一組要消滅的東西。
   */
  it("writeBalance 省略該欄時不動它（授予與人工調整走這條）", async () => {
    addExpiringSoon();
    await rebuild();
    expect(balanceRow()?.expiringSoonMinutes).toBe(300);

    await writeBalance(ledger.client, {
      ...SCOPE,
      remainingMinutes: 999,
    });

    expect(balanceRow()?.remainingMinutes).toBe(999);
    expect(balanceRow()?.expiringSoonMinutes).toBe(300);
  });

  /**
   * Info: (20260820 - Julian) 「逐欄相同」現在真的成立：把整列的每一欄
   * 都與重建算出來的值比對，而不是只比 `remainingMinutes`。
   *
   * 用 `Object.keys` 列出實際欄位再逐一比，而不是寫死五個欄位名 ——
   * 日後 `LeaveBalance` 再多一欄而重建沒跟上時，這一條會紅。
   */
  it("重建結果與快取逐欄相同", async () => {
    addExpiringSoon();
    await rebuild();

    const row = balanceRow();
    expect(row).toBeDefined();
    if (row === undefined) return;

    expect(Object.keys(row).sort()).toEqual([
      "accountBookId",
      "employeeId",
      "expiringSoonMinutes",
      "leavePolicyId",
      "reconciledAt",
      "remainingMinutes",
    ]);
    expect(row).toEqual({
      ...SCOPE,
      remainingMinutes: await sumLedgerMinutes(ledger.client, SCOPE),
      expiringSoonMinutes: 300,
      reconciledAt: RECONCILED_AT,
    });
  });
});
