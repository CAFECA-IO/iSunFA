import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

/**
 * Info: (20260820 - Julian) 補休折換這條路徑先前**整個 PR 沒有跑過一次**
 * （review 第 4 輪第 5 條）。
 *
 * `overtime_request_service.test.ts` 的 fixture 全是 `PAYMENT`，而它用的是
 * 假 repository —— 於是 `approve` 迴圈裡的
 * `deriveCompensatoryGrantDays` → `assertGrantSource` → `leaveGrant.create`
 * → `leaveLedgerEntry.create` → 餘額回寫這一整段，沒有任何測試執行到。
 * 那一段同時是 §32-1「一小時換一小時」在程式裡的唯一執行者。
 *
 * ## 為什麼替身停在 prisma 那一層
 *
 * 被測的是 repository 自己的那個迴圈。假 repository 會把它整支換掉，
 * 問題就從測試裡消失（checklist §1.7）。這裡的替身停在 prisma，
 * `deriveCompensatoryGrantDays` 與 `assertGrantSource` 都是**真的**那兩支。
 */

const row = {
  id: "ot-1",
  accountBookId: "book-1",
  status: "PENDING",
  isEmergency: false,
};

interface ICapture {
  segments: Record<string, unknown>[];
  grants: Record<string, unknown>[];
  ledger: Record<string, unknown>[];
  cashOuts: Record<string, unknown>[];
  balances: unknown[];
}

const captured: ICapture = {
  segments: [],
  grants: [],
  ledger: [],
  cashOuts: [],
  balances: [],
};

const matches = (where: Record<string, unknown>): boolean =>
  Object.entries(where).every(
    ([key, value]) => (row as Record<string, unknown>)[key] === value,
  );

jest.mock("@/lib/prisma", () => {
  /**
   * Info: (20260820 - Julian) 收 **getter** 而不是收陣列本身。
   *
   * `jest.mock` 的工廠會被提升到 `const captured` 之上，因此工廠執行的當下
   * 讀 `captured.segments` 會踩到 TDZ（`Cannot access 'captured' before
   * initialization`）。改成在**呼叫時**才取，順帶讓 `beforeEach` 裡
   * 「整條換掉」的重置也照樣生效。
   */
  const create =
    (bucketOf: () => Record<string, unknown>[], prefix: string) =>
    async ({ data }: { data: Record<string, unknown> }) => {
      const bucket = bucketOf();
      bucket.push(data);
      return { id: `${prefix}-${bucket.length}` };
    };
  const tx = {
    overtimeRequest: {
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          if (!matches(where)) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        },
      ),
      findFirst: jest.fn(async () => ({
        status: row.status,
        isEmergency: row.isEmergency,
      })),
    },
    overtimeSegment: { create: jest.fn(create(() => captured.segments, "seg")) },
    leaveGrant: {
      create: jest.fn(create(() => captured.grants, "grant")),
      // Info: (20260820 - Julian) `sumLedgerMinutes` 走的那一支
      findMany: jest.fn(async () =>
        captured.grants.map((_grant, index) => ({ id: `grant-${index + 1}` })),
      ),
    },
    leaveLedgerEntry: {
      create: jest.fn(create(() => captured.ledger, "entry")),
      aggregate: jest.fn(async () => ({
        _sum: {
          deltaMinutes: captured.ledger.reduce(
            (total, entry) => total + Number(entry.deltaMinutes),
            0,
          ),
        },
      })),
    },
    leaveCashOutEvent: { create: jest.fn(create(() => captured.cashOuts, "cash")) },
    leaveBalance: {
      upsert: jest.fn(async (args: unknown) => {
        captured.balances.push(args);
        return {};
      }),
    },
    /**
     * Info: (20260820 - Julian) `ledgerActorOf` 要查操作者的姓名工號
     * （review 第 6 輪 M16）。
     *
     * 這一段是後補的：M16 讓每一筆帳本分錄都帶操作者快照，而快照由
     * repository 在寫入前查一次 —— 於是這支替身少了 `employee`，
     * 整組測試以 `Cannot read properties of undefined` 收場。
     *
     * **帳本 id 對不上時回 null**：`ledgerActorOf` 對那條路徑是丟例外
     * （一筆人為調整偽裝成系統動作，是稽核上最不該發生的那一種），
     * 少了這一段，那道防線在測試裡就不存在。
     */
    employee: {
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; accountBookId: string } }) =>
          where.accountBookId === "book-1" && where.id === "mgr-1"
            ? { id: "mgr-1", employeeNo: "MGR001", name: "測試主管" }
            : null,
      ),
    },
  };
  return {
    prisma: {
      ...tx,
      $transaction: async (fn: (client: unknown) => Promise<unknown>) => fn(tx),
    },
  };
});

import { overtimeRequestRepo } from "@/repositories/overtime_request.repo";
import { OvertimeRuleError } from "@/lib/overtime_rules";
import {
  buildOvertimeGrantIdempotencyKey,
  OvertimeEvidenceBasis,
  OvertimeFilingType,
  OvertimePremiumTier,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import { LeaveGrantSource, LeaveLedgerEntryType } from "@/constants/leave_policy";
import { OvertimeDecisionOutcome } from "@/interfaces/overtime";

const SHIFT_WINDOW_MS = Date.UTC(2026, 7, 15, 9, 0, 0);
const WORK_DATE = "2026-08-15";
const DAY_EQUIVALENT = 480;

/**
 * Info: (20260820 - Julian) 兩段：120 分（1/3 加給）＋ 60 分（2/3 加給）。
 * 一段換不出「一段一批」這條規矩，也看不出補休不吃加給倍率。
 */
const SEGMENTS = [
  { order: 0, tier: OvertimePremiumTier.WEEKDAY_FIRST_2H, minutes: 120 },
  { order: 1, tier: OvertimePremiumTier.WEEKDAY_BEYOND_2H, minutes: 60 },
];

const writeOf = (overrides: {
  compensatory?: {
    leavePolicyId: string;
    dayEquivalentMinutes: number;
    expiresOn: string;
  } | null;
  cashOut?: { dayEquivalentMinutes: number; legalBasis: string } | null;
} = {}) => ({
  accountBookId: "book-1",
  requestId: "ot-1",
  employeeId: "emp-1",
  workDate: WORK_DATE,
  actorEmployeeId: "mgr-1",
  approvedMinutes: 180,
  recognizedMinutes: 180,
  evidenceBasis: OvertimeEvidenceBasis.MANUAL_DECLARATION,
  segments: SEGMENTS,
  isEmergencyAtDerivation: false,
  engineVersion: 1,
  invariant: {
    filingType: OvertimeFilingType.POST_HOC,
    status: OvertimeRequestStatus.APPROVED,
    submittedAtMs: SHIFT_WINDOW_MS + 3_600_000,
    shiftWindowStartMs: SHIFT_WINDOW_MS,
    requestedStartMinute: 1020,
    requestedEndMinute: 1200,
    approvedMinutes: 180,
    recognizedMinutes: 180,
  },
  compensatory:
    overrides.compensatory === undefined
      ? {
          leavePolicyId: "policy-comp",
          dayEquivalentMinutes: DAY_EQUIVALENT,
          expiresOn: "2027-02-15",
        }
      : overrides.compensatory,
  cashOut: overrides.cashOut ?? null,
});

beforeEach(() => {
  row.status = "PENDING";
  row.isEmergency = false;
  captured.segments = [];
  captured.grants = [];
  captured.ledger = [];
  captured.cashOuts = [];
  captured.balances = [];
});

describe("補休折換：一段一批，且一小時換一小時（§32-1）", () => {
  it("每一段各換出一批補休，天數由分鐘與一日面額整除得出", async () => {
    const result = await overtimeRequestRepo.approve(writeOf());

    expect(result.outcome).toBe(OvertimeDecisionOutcome.DECIDED);
    expect(result.grantCount).toBe(2);
    expect(result.cashOutEventIds).toEqual([]);
    expect(captured.segments).toHaveLength(2);
    expect(captured.grants).toHaveLength(2);

    /**
     * Info: (20260820 - Julian) 期望值由**法條算出來**，不是抄實作：
     * 120 分 ÷ 480 分/日 = 0.25 日，60 分 ÷ 480 = 0.125 日。
     * `grantedDays` 以字串落地（Decimal 邊界防護，CLAUDE.md §2）。
     */
    expect(captured.grants.map((grant) => grant.grantedDays)).toEqual([
      "0.25",
      "0.125",
    ]);
    /**
     * Info: (20260820 - Julian) 這一條是 §32-1 的紅線：分鐘數等於分段分鐘，
     * **不乘加給倍率**。第二段是 2/3 加給，若哪天有人把倍率搬到折換這一步，
     * 它會變成 100 而不是 60。
     */
    expect(captured.grants.map((grant) => grant.grantedMinutes)).toEqual([
      120, 60,
    ]);
    expect(captured.grants.map((grant) => grant.source)).toEqual([
      LeaveGrantSource.OVERTIME_CONVERSION,
      LeaveGrantSource.OVERTIME_CONVERSION,
    ]);
    // Info: (20260820 - Julian) 補休的「週期」就是加班那一天本身
    expect(captured.grants.map((grant) => grant.cycleStartDate)).toEqual([
      WORK_DATE,
      WORK_DATE,
    ]);
    expect(captured.grants.map((grant) => grant.expiresOn)).toEqual([
      "2027-02-15",
      "2027-02-15",
    ]);
    // Info: (20260820 - Julian) 每一批各掛回自己那一段，不是全掛在第一段上
    expect(captured.grants.map((grant) => grant.overtimeSegmentId)).toEqual([
      "seg-1",
      "seg-2",
    ]);
  });

  it("帳本列與冪等鍵以分段 id 組成，兩段不會撞在一起", async () => {
    await overtimeRequestRepo.approve(writeOf());

    expect(captured.ledger.map((entry) => entry.entryType)).toEqual([
      LeaveLedgerEntryType.GRANT,
      LeaveLedgerEntryType.GRANT,
    ]);
    expect(captured.ledger.map((entry) => entry.deltaMinutes)).toEqual([
      120, 60,
    ]);
    expect(captured.ledger.map((entry) => entry.idempotencyKey)).toEqual([
      buildOvertimeGrantIdempotencyKey("seg-1"),
      buildOvertimeGrantIdempotencyKey("seg-2"),
    ]);
    expect(new Set(captured.ledger.map((entry) => entry.idempotencyKey)).size).toBe(2);
  });

  /**
   * Info: (20260820 - Julian) 餘額快取在同一筆交易裡回寫（ADR 022 §4）。
   * 少了它，補休入帳完成而餘額仍是 0，扣減端的附條件更新會讀成「額度不足」。
   */
  it("餘額快取在同交易內回寫，且等於帳本加總", async () => {
    await overtimeRequestRepo.approve(writeOf());

    expect(captured.balances).toHaveLength(1);
    const upsert = captured.balances[0] as {
      create: { remainingMinutes: number };
      update: { remainingMinutes: number };
    };
    expect(upsert.create.remainingMinutes).toBe(180);
    expect(upsert.update.remainingMinutes).toBe(180);
  });

  /**
   * Info: (20260820 - Julian) 1:1 由**真的** `assertGrantSource` 把關。
   *
   * 這裡刻意送一份「一日面額 = 0」的補休設定：`deriveCompensatoryGrantDays`
   * 會當場拒絕，而不是安靜地算出 Infinity 天再讓資料庫收下。
   * 沒有這一條，「不變式有跑到」就只是一句註解。
   */
  it("一日面額為 0 時當場擋下，不寫任何一批", async () => {
    await expect(
      overtimeRequestRepo.approve(
        writeOf({
          compensatory: {
            leavePolicyId: "policy-comp",
            dayEquivalentMinutes: 0,
            expiresOn: "2027-02-15",
          },
        }),
      ),
    ).rejects.toBeInstanceOf(OvertimeRuleError);

    expect(captured.grants).toHaveLength(0);
    expect(captured.ledger).toHaveLength(0);
  });

  /**
   * Info: (20260820 - Julian) 對照組：發錢模式一段一筆折現事件，且**不發補休**。
   *
   * 兩個方向各一條 —— 只留補休那一條的話，一份 `compensatory` 與 `cashOut`
   * 都非 null 的 payload 也會通過，而迴圈裡的 `continue` 會把折現靜默吃掉。
   */
  it("發錢模式改成一段一筆折現事件，不產生任何補休批次", async () => {
    const result = await overtimeRequestRepo.approve(
      writeOf({
        compensatory: null,
        cashOut: { dayEquivalentMinutes: DAY_EQUIVALENT, legalBasis: "§24 I" },
      }),
    );

    expect(result.grantCount).toBe(0);
    expect(result.cashOutEventIds).toEqual(["cash-1", "cash-2"]);
    expect(captured.grants).toHaveLength(0);
    expect(captured.balances).toHaveLength(0);
    // Info: (20260820 - Julian) 級距要逐段落地：併成一筆就說不出哪段是 2/3
    expect(captured.cashOuts.map((event) => event.premiumTier)).toEqual([
      OvertimePremiumTier.WEEKDAY_FIRST_2H,
      OvertimePremiumTier.WEEKDAY_BEYOND_2H,
    ]);
    expect(captured.cashOuts.map((event) => event.minutes)).toEqual([120, 60]);
  });
});

/**
 * Info: (20260820 - Julian) 帳本分錄要記得住操作者（review 第 6 輪 M16）。
 *
 * `LeaveLedgerEntry.actorEmployeeId` 是 `SetNull`，讀取端先前靠 live join
 * 取姓名 —— 那位主管離職之後，這筆補休入帳就查不出是誰核准的。
 * 額度帳本是 append-only 的稽核來源（ADR 022 §1）。
 */
describe("補休入帳帶著操作者的姓名工號快照（M16）", () => {
  it("三欄一起落地，且姓名工號來自查詢而不是呼叫端自己填", async () => {
    await overtimeRequestRepo.approve(writeOf());

    expect(captured.ledger).toHaveLength(2);
    for (const entry of captured.ledger) {
      expect(entry.actorEmployeeId).toBe("mgr-1");
      expect(entry.actorEmployeeNo).toBe("MGR001");
      expect(entry.actorName).toBe("測試主管");
    }
  });

  /**
   * Info: (20260820 - Julian) 操作者不屬於這個帳本時**擋下**，不是回 null。
   *
   * 回 null 會讓那一列看起來像系統排程產生的 —— 一筆人為核准偽裝成系統動作。
   * 這一條同時證明快照真的來自查詢：若實作改成直接抄 `params.actorEmployeeId`，
   * 它會綠著寫下一個查不到的人。
   */
  it("操作者不在這個帳本時擋下，一筆都不寫", async () => {
    await expect(
      overtimeRequestRepo.approve({
        ...writeOf(),
        actorEmployeeId: "mgr-from-another-book",
      }),
    ).rejects.toThrow();

    /**
     * Info: (20260820 - Julian) **連分段都還沒寫**。
     *
     * 操作者是在迴圈之前解出來的，因此租戶不符會在任何寫入之前擋下 ——
     * 只斷言 `grants` 與 `ledger` 為空的話，一個「先寫分段再檢查」的實作
     * 也會通過，而它已經在資料庫裡留下了一段孤兒分段（正式環境靠交易回滾
     * 收拾，但順序不該靠回滾才正確）。
     */
    expect(captured.segments).toHaveLength(0);
    expect(captured.grants).toHaveLength(0);
    expect(captured.ledger).toHaveLength(0);
  });
});
