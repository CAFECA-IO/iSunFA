import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

/**
 * Info: (20260821 - Julian) 每日勾稽排程（review 第 16 輪）——**這一支先前零測試**。
 *
 * ## 沒有它的時候，什麼東西沒有證據
 *
 * `runLeaveBalanceReconcile` 是 `LeaveBalance.reconciledAt` 與
 * `expiringSoonMinutes` 在正式環境的**唯一**寫入者（`issue` / `adjust`
 * 兩條路徑刻意不碰第二欄 —— 它們手上沒有「今天是哪一天」）。
 * 它算錯或安靜地少數一欄，畫面上的症狀是「所有人都顯示即將到期 0 分鐘」，
 * 而那與「真的沒有即將到期」長得一模一樣。
 *
 * ## 修掉的缺陷
 *
 * 上一版只比 `remainingMinutes`。ADR 022 §8.1 對這條紅線的要求是
 * 「重建結果與快取**逐欄**相同」，而 `rebuildBalance` 當時只回一個數字 ——
 * 那個簽章讓「逐欄」在呼叫端不可能成立。`expiringSoonMinutes` 漂掉
 * 不會被算進 `mismatched`，於是這支排程會回報「0 組不一致」。
 *
 * ## 替身放在 prisma 那一層
 *
 * 與 `overtime_tier_order_independence.test.ts` 同一個理由：把
 * `mismatched` 當輸入餵進假 repository，證明的是「回傳值有沒有被轉出去」，
 * 而錯的正是計算它的那一段。這裡 `rebuildBalance` 走的是真的那一支。
 */

interface IBalanceRow {
  [key: string]: unknown;
  employeeId: string;
  leavePolicyId: string;
  remainingMinutes: number;
  expiringSoonMinutes: number;
  reconciledAt: Date | null;
}

const BOOK = "book-1";
const POLICY = "policy-annual";

let balances: IBalanceRow[] = [];
let scopes: {
  accountBookId: string;
  employeeId: string;
  leavePolicyId: string;
}[] = [];

/**
 * Info: (20260821 - Julian) 帳本那一側由替身直接給答案：這一支測的是
 * 「勾稽有沒有逐欄比對並數對」，不是 `sumLedgerMinutes` 算得對不對
 * （那由 `leave_ledger_conservation.test.ts` 負責）。
 */
let ledgerTruth = new Map<
  string,
  { remainingMinutes: number; expiringSoonMinutes: number }
>();

/** Info: (20260821 - Julian) 讓測試模擬某一組重建時炸掉 */
let throwFor: string | null = null;

const warnings: string[] = [];

jest.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: jest.fn((message: string) => {
      warnings.push(message);
    }),
    error: jest.fn((message: string) => {
      warnings.push(message);
    }),
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    leaveGrant: {
      findMany: jest.fn(async () => scopes),
    },
    leaveBalance: {
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: {
            employeeId_leavePolicyId: {
              employeeId: string;
              leavePolicyId: string;
            };
          };
        }) => {
          const key = where.employeeId_leavePolicyId;
          const row = balances.find(
            (one) =>
              one.employeeId === key.employeeId &&
              one.leavePolicyId === key.leavePolicyId,
          );
          /**
           * Info: (20260821 - Julian) 回**複本**，不是那一列本身。
           *
           * 真的 Prisma 讀出來的是一份快照。回原物件的話，被測程式先讀
           * `before`、再呼叫 `rebuildBalance`（替身會就地覆寫那一列），
           * 於是等到比對的那一刻 `before` 已經變成重建後的值 ——
           * **每一組都相等，一組都不會漂**。這一版的替身第一次就是這樣寫的，
           * 而症狀是「逐欄比對的測試全綠，但它什麼都沒比到」。
           */
          return row === undefined ? null : { ...row };
        },
      ),
    },
  },
}));

/**
 * Info: (20260821 - Julian) 重建以真的簽章回**兩欄**，並如產品那樣覆寫快取。
 *
 * 替身在 repository 這一層而不是 prisma：重建的內部（兩支 aggregate ＋
 * 一次 upsert）已經有守恆測試釘住，這裡要的是它的**契約** ——
 * 少回一欄時這一檔要紅。
 */
jest.mock("@/repositories/leave_grant.repo", () => ({
  leaveGrantRepo: {
    rebuildBalance: jest.fn(
      async (params: {
        employeeId: string;
        leavePolicyId: string;
        reconciledAt: Date;
      }) => {
        if (throwFor === params.employeeId) {
          throw new Error("ledger unavailable");
        }
        const key = `${params.employeeId}/${params.leavePolicyId}`;
        const truth = ledgerTruth.get(key);
        if (truth === undefined) throw new Error(`fixture 少了 ${key}`);

        const row = balances.find(
          (one) =>
            one.employeeId === params.employeeId &&
            one.leavePolicyId === params.leavePolicyId,
        );
        if (row === undefined) {
          balances.push({
            employeeId: params.employeeId,
            leavePolicyId: params.leavePolicyId,
            ...truth,
            reconciledAt: params.reconciledAt,
          });
        } else {
          row.remainingMinutes = truth.remainingMinutes;
          row.expiringSoonMinutes = truth.expiringSoonMinutes;
          row.reconciledAt = params.reconciledAt;
        }
        return truth;
      },
    ),
  },
}));

import { runLeaveBalanceReconcile } from "@/services/cron/leave_balance_reconcile.cron";

const scopeOf = (employeeId: string) => ({
  accountBookId: BOOK,
  employeeId,
  leavePolicyId: POLICY,
});

const cacheOf = (
  employeeId: string,
  overrides: Partial<IBalanceRow> = {},
): IBalanceRow => ({
  employeeId,
  leavePolicyId: POLICY,
  remainingMinutes: 1440,
  expiringSoonMinutes: 480,
  reconciledAt: new Date("2026-08-20T00:00:00.000Z"),
  ...overrides,
});

const LEDGER = { remainingMinutes: 1440, expiringSoonMinutes: 480 };

beforeEach(() => {
  warnings.length = 0;
  throwFor = null;
  scopes = [scopeOf("emp-1")];
  balances = [cacheOf("emp-1")];
  ledgerTruth = new Map([[`emp-1/${POLICY}`, { ...LEDGER }]]);
});

describe("額度勾稽：逐欄比對", () => {
  // Info: (20260821 - Julian) 對照組。少了它，一個「永遠回報不一致」的實作會通過
  it("兩欄都相符時，一組都不算漂", async () => {
    const result = await runLeaveBalanceReconcile();

    expect(result).toMatchObject({
      scanned: 1,
      mismatched: 0,
      mismatchedRemaining: 0,
      mismatchedExpiringSoon: 0,
      neverReconciled: 0,
      failed: 0,
    });
  });

  /**
   * Info: (20260821 - Julian) **這一條在 2026-08-21 之前會綠，而它該紅。**
   *
   * 只有 `expiringSoonMinutes` 漂掉：上一版的比對式是
   * `before.remainingMinutes !== after`，這種漂法完全看不見。
   * 它正是 M13 的形狀 —— 那一欄先前沒有任何寫入者，畫面對每個人都顯示
   * 「即將到期 0 分鐘」，而 §38 IV 的折現提醒因此從來沒有發生過。
   */
  it("只有 expiringSoonMinutes 漂掉時，仍然算一組不一致", async () => {
    balances = [cacheOf("emp-1", { expiringSoonMinutes: 0 })];

    const result = await runLeaveBalanceReconcile();

    expect(result.mismatched).toBe(1);
    expect(result.mismatchedExpiringSoon).toBe(1);
    // Info: (20260821 - Julian) 而餘額那一欄是對的，不得被順手算成漂
    expect(result.mismatchedRemaining).toBe(0);
  });

  it("只有 remainingMinutes 漂掉時，只算在餘額那一欄", async () => {
    balances = [cacheOf("emp-1", { remainingMinutes: 99999 })];

    const result = await runLeaveBalanceReconcile();

    expect(result.mismatched).toBe(1);
    expect(result.mismatchedRemaining).toBe(1);
    expect(result.mismatchedExpiringSoon).toBe(0);
  });

  /**
   * Info: (20260821 - Julian) 兩欄一起漂只算**一組**，不是兩組。
   * `mismatched` 數的是「有幾組人的快取與帳本不符」，
   * 拿它去除以 `scanned` 要得出一個比例 —— 相加會讓那個比例超過 1。
   */
  it("兩欄一起漂時，mismatched 仍然是 1", async () => {
    balances = [
      cacheOf("emp-1", { remainingMinutes: 0, expiringSoonMinutes: 0 }),
    ];

    const result = await runLeaveBalanceReconcile();

    expect(result.mismatched).toBe(1);
    expect(result.mismatchedRemaining).toBe(1);
    expect(result.mismatchedExpiringSoon).toBe(1);
  });

  /**
   * Info: (20260821 - Julian) log 要把**沒漂的那一欄**也印出來。
   * 只印漂掉的那一欄，事後看 log 的人分不出「另一欄是對的」與
   * 「另一欄沒有被檢查」—— 而後者正是這一輪修掉的東西。
   */
  it("不一致的 log 兩欄都印，並標出漂的是哪一欄", async () => {
    balances = [cacheOf("emp-1", { expiringSoonMinutes: 0 })];

    await runLeaveBalanceReconcile();

    const line = warnings.find((one) => one.includes("balance mismatch"));
    expect(line).toBeDefined();
    expect(line).toContain("remaining: cache=1440 ledger=1440");
    expect(line).toContain("expiringSoon: cache=0 ledger=480 DRIFT");
    // Info: (20260821 - Julian) 沒漂的那一欄不得被標成 DRIFT
    expect(line).not.toContain("ledger=1440 DRIFT");
  });
});

describe("額度勾稽：沒有快取列、沒對過帳、以及壞掉的那幾組", () => {
  /**
   * Info: (20260821 - Julian) 帳本有分錄、快取整列不存在。
   *
   * 這正是 `scopesOf` 從 `LeaveGrant` 那一側掃的理由 ——
   * 從 `LeaveBalance` 掃的話這種列查不到，而畫面上那個假別會整個消失。
   */
  it("快取整列不存在時，兩欄都算漂且算一次沒對過帳", async () => {
    balances = [];

    const result = await runLeaveBalanceReconcile();

    expect(result).toMatchObject({
      scanned: 1,
      mismatched: 1,
      mismatchedRemaining: 1,
      mismatchedExpiringSoon: 1,
      neverReconciled: 1,
      failed: 0,
    });
    expect(warnings.some((one) => one.includes("balance missing"))).toBe(true);
  });

  /**
   * Info: (20260821 - Julian) `reconciledAt` 為 null ＝ 從來沒有人對過帳。
   *
   * 它**不算不一致**（帳可能剛好是對的），但它是「這支排程沒在跑」的證據。
   * 上一版根本沒有這個訊號，於是一個從未被排上的 Worker 與一個
   * 每小時都跑得好好的 Worker，在報告上長得一模一樣。
   */
  it("reconciledAt 為 null 時算沒對過帳，但不算不一致", async () => {
    balances = [cacheOf("emp-1", { reconciledAt: null })];

    const result = await runLeaveBalanceReconcile();

    expect(result.neverReconciled).toBe(1);
    expect(result.mismatched).toBe(0);
  });

  /**
   * Info: (20260821 - Julian) 一組炸掉不該讓其餘的都不對帳 —— 但要數出來。
   * 一支回報「0 組不一致」而其實有一半沒跑成功的排程，比沒有它更危險。
   */
  it("一組重建炸掉時，其餘照跑，且 failed 數得出來", async () => {
    scopes = [scopeOf("emp-1"), scopeOf("emp-2")];
    balances = [cacheOf("emp-1"), cacheOf("emp-2", { remainingMinutes: 1 })];
    ledgerTruth.set(`emp-2/${POLICY}`, { ...LEDGER });
    throwFor = "emp-1";

    const result = await runLeaveBalanceReconcile();

    expect(result).toMatchObject({
      scanned: 2,
      failed: 1,
      mismatched: 1,
      mismatchedRemaining: 1,
    });
  });

  /**
   * Info: (20260821 - Julian) 冪等：連跑兩次，第二次一組都不漂。
   * 第一次已經把快取覆寫成帳本的值，第二次還在報漂就表示重建不是冪等的。
   */
  it("連跑兩次，第二次一組都不漂", async () => {
    balances = [
      cacheOf("emp-1", { remainingMinutes: 0, expiringSoonMinutes: 0 }),
    ];

    const first = await runLeaveBalanceReconcile();
    const second = await runLeaveBalanceReconcile();

    expect(first.mismatched).toBe(1);
    expect(second.mismatched).toBe(0);
    expect(second.neverReconciled).toBe(0);
  });
});
