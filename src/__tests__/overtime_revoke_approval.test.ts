import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import { IFakeWhere, matchesRow } from "@/lib/testing/fake_prisma_where";

/**
 * Info: (20260821 - Julian) 撤銷核准的**補休那一條路徑**與它的邊界
 * （review 第 7 輪 B1、第 8 輪第 1／2／3／4 條）。
 *
 * `overtime_same_day_reachability.test.ts` 走完整條可達序列，但一律 `PAYMENT`。
 * 選補休的單子多三樣：額度批次、`GRANT` 分錄、餘額快取，而且它有一個
 * `PAYMENT` 沒有的邊界：**補休一旦被請掉、過期或折現，核准就不能再撤銷了。**
 *
 * ## 第 8 輪修掉的三件事
 *
 * 1. **不再硬刪帳本與批次**（ADR 022 §2.1「永不 delete」、§2.4「撤銷是寫反向
 *    分錄」）。改成補一筆負向 `ADJUST` 並在批次上標 `revokedAt`。
 * 2. **折現事件逐段對得起來**：連結數 ≠ 分段數就丟，否則舊列（`overtime_segment_id
 *    IS NULL`，而 PostgreSQL 的 unique 不約束 NULL）會留下孤兒並在重新核准時付兩次。
 * 3. **`settledAt` 改成條件式刪除**：折現這一側沒有外鍵當後盾，先查後改在
 *    READ COMMITTED 下擋不住薪資模組在中間 commit。
 *
 * ## 替身：`where` 全部走共用比對器
 *
 * 第一版有六支方法完全不看 `where`，於是「刪這一張」與「刪整張表」在替身裡
 * 塌成同一個值 —— 而這是本模組破壞性最強的一支端點。現在每一支都走
 * `matchesRow`，不認得的鍵直接丟。
 */

const BOOK = "book-1";
const REQUEST = "ot-1";
const OTHER_REQUEST = "ot-2";
const POLICY = "policy-comp";
const REVOKED_BY = "emp-005";
const REVOKED_AT = new Date("2026-08-21T02:00:00.000Z");

interface IRow {
  [key: string]: unknown;
}

let requests: IRow[] = [];
let segments: IRow[] = [];
let grants: IRow[] = [];
let entries: IRow[] = [];
let cashOuts: IRow[] = [];
let balances: IRow[] = [];

/** Info: (20260821 - Julian) 為真時，預檢跑完之後才注入一筆扣減（模擬競態） */
let raceEntryAfterPrecheck = false;

/** Info: (20260821 - Julian) 為真時，`count` 之後才把折現事件標成已結算 */
let settleAfterPrecheck = false;

const REQUEST_FIELDS = ["id", "accountBookId", "status"];
const SEGMENT_FIELDS = ["id", "overtimeRequestId"];
/**
 * Info: (20260821 - Julian) 含 `accountBookId` / `employeeId` / `leavePolicyId`：
 * 餘額重算走的 `sumLedgerMinutes` 是用那三個欄位查批次的。第一版漏了它們，
 * 而替身**當場丟**「不支援這個條件鍵」—— 那正是它該有的行為。
 */
const GRANT_FIELDS = [
  "id",
  "accountBookId",
  "employeeId",
  "leavePolicyId",
  "overtimeSegmentId",
  "revokedAt",
];
const ENTRY_FIELDS = ["id", "leaveGrantId", "entryType"];
const CASH_OUT_FIELDS = ["id", "overtimeSegmentId", "settledAt"];

/**
 * Info: (20260821 - Julian) 外鍵 `onDelete: Restrict` 由替身**模擬**。
 * 只實作被斷言的那一條規則，訊息形狀比照 Prisma 的 P2003。
 */
const RESTRICT_MESSAGE =
  "Foreign key constraint violated on the constraint: `leave_ledger_entry_leave_grant_id_fkey`";

jest.mock("@/lib/prisma", () => {
  const client = {
    overtimeRequest: {
      updateMany: jest.fn(
        async ({ where, data }: { where: IFakeWhere; data: IFakeWhere }) => {
          const hits = requests.filter((row) =>
            matchesRow(row, where, REQUEST_FIELDS),
          );
          for (const row of hits) {
            for (const [key, value] of Object.entries(data)) {
              if (
                value !== null &&
                typeof value === "object" &&
                "increment" in (value as IFakeWhere)
              ) {
                row[key] =
                  ((row[key] as number) ?? 0) +
                  ((value as { increment: number }).increment ?? 0);
                continue;
              }
              row[key] = value;
            }
          }
          return { count: hits.length };
        },
      ),
      findFirst: jest.fn(async ({ where }: { where: IFakeWhere }) => {
        const hit = requests.find((row) =>
          matchesRow(row, where, REQUEST_FIELDS),
        );
        return hit === undefined ? null : { ...hit };
      }),
    },
    overtimeSegment: {
      findMany: jest.fn(async ({ where }: { where: IFakeWhere }) =>
        segments.filter((row) => matchesRow(row, where, SEGMENT_FIELDS)),
      ),
      deleteMany: jest.fn(async ({ where }: { where: IFakeWhere }) => {
        const keep = segments.filter(
          (row) => !matchesRow(row, where, SEGMENT_FIELDS),
        );
        const count = segments.length - keep.length;
        segments = keep;
        return { count };
      }),
    },
    leaveGrant: {
      findMany: jest.fn(async ({ where }: { where: IFakeWhere }) =>
        grants
          .filter((row) => matchesRow(row, where, GRANT_FIELDS))
          .map((row) => ({ ...row })),
      ),
      updateMany: jest.fn(
        async ({ where, data }: { where: IFakeWhere; data: IFakeWhere }) => {
          const hits = grants.filter((row) =>
            matchesRow(row, where, GRANT_FIELDS),
          );
          for (const row of hits) Object.assign(row, data);
          return { count: hits.length };
        },
      ),
      deleteMany: jest.fn(async ({ where }: { where: IFakeWhere }) => {
        const doomed = grants.filter((row) =>
          matchesRow(row, where, GRANT_FIELDS),
        );
        const ids = new Set(doomed.map((row) => row.id as string));
        if (entries.some((entry) => ids.has(entry.leaveGrantId as string))) {
          throw new Error(RESTRICT_MESSAGE);
        }
        grants = grants.filter((row) => !ids.has(row.id as string));
        return { count: doomed.length };
      }),
    },
    leaveLedgerEntry: {
      create: jest.fn(async ({ data }: { data: IRow }) => {
        /**
         * Info: (20260821 - Julian) `idempotencyKey` 的唯一鍵也要模擬。
         * 少了它，「第二次撤銷會被當成重放」那一條就沒有東西在驗。
         */
        if (
          entries.some((entry) => entry.idempotencyKey === data.idempotencyKey)
        ) {
          throw new Error(
            "Unique constraint failed on the fields: (`idempotency_key`)",
          );
        }
        const row = { ...data, id: `entry-${entries.length + 1}` };
        entries.push(row);
        return row;
      }),
      count: jest.fn(async ({ where }: { where: IFakeWhere }) => {
        const hits = entries.filter((row) =>
          matchesRow(row, where, ENTRY_FIELDS),
        ).length;
        /**
         * Info: (20260821 - Julian) 預檢**之後**才落地的那一次扣減。
         * 這是模擬競態唯一誠實的位置：預檢照樣回 0（此刻它還不存在），
         * 而後續的刪除／更新執行時它已經在了。
         */
        if (raceEntryAfterPrecheck) {
          raceEntryAfterPrecheck = false;
          entries.push({
            id: "entry-race",
            leaveGrantId: "grant-1",
            entryType: "CONSUME",
            deltaMinutes: -60,
          });
        }
        return hits;
      }),
      // Info: (20260821 - Julian) `aggregate` 也要看 `where`，否則跨批次的加總會塌成同一個值
      aggregate: jest.fn(async ({ where }: { where: IFakeWhere }) => ({
        _sum: {
          deltaMinutes: entries
            .filter((row) => matchesRow(row, where, ENTRY_FIELDS))
            .reduce(
              (total, entry) => total + ((entry.deltaMinutes as number) ?? 0),
              0,
            ),
        },
      })),
    },
    leaveCashOutEvent: {
      count: jest.fn(async ({ where }: { where: IFakeWhere }) => {
        const hits = cashOuts.filter((row) =>
          matchesRow(row, where, CASH_OUT_FIELDS),
        ).length;
        // Info: (20260821 - Julian) 薪資模組在 count 與 deleteMany 之間 commit
        if (settleAfterPrecheck) {
          settleAfterPrecheck = false;
          for (const row of cashOuts) row.settledAt = new Date();
        }
        return hits;
      }),
      deleteMany: jest.fn(async ({ where }: { where: IFakeWhere }) => {
        const keep = cashOuts.filter(
          (row) => !matchesRow(row, where, CASH_OUT_FIELDS),
        );
        const count = cashOuts.length - keep.length;
        cashOuts = keep;
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

import {
  overtimeRequestRepo,
  OvertimeApprovalNotReversibleError,
} from "@/repositories/overtime_request.repo";
import { OvertimeDecisionOutcome } from "@/interfaces/overtime";
import { LeaveLedgerEntryType } from "@/constants/leave_policy";
import {
  buildOvertimeRevokeIdempotencyKey,
  OvertimeCompensationMode,
} from "@/constants/overtime";
import { consumableGrantWhere } from "@/repositories/leave_ledger";

const revoke = (requestId: string = REQUEST) =>
  overtimeRequestRepo.revokeApproval({
    accountBookId: BOOK,
    requestId,
    revokedByEmployeeId: REVOKED_BY,
    revokedAt: REVOKED_AT,
  });

const compensatoryFixture = () => {
  requests = [
    {
      id: REQUEST,
      accountBookId: BOOK,
      status: "APPROVED",
      compensationMode: OvertimeCompensationMode.COMPENSATORY_LEAVE,
      approvalRevokeCount: 0,
    },
  ];
  segments = [{ id: "seg-1", overtimeRequestId: REQUEST }];
  grants = [
    {
      id: "grant-1",
      accountBookId: BOOK,
      overtimeSegmentId: "seg-1",
      employeeId: "emp-006",
      leavePolicyId: POLICY,
      grantedMinutes: 120,
      revokedAt: null,
    },
  ];
  entries = [
    {
      id: "entry-1",
      leaveGrantId: "grant-1",
      entryType: LeaveLedgerEntryType.GRANT,
      deltaMinutes: 120,
      idempotencyKey: "overtime-grant:seg-1",
    },
  ];
  cashOuts = [];
};

beforeEach(() => {
  compensatoryFixture();
  balances = [];
  raceEntryAfterPrecheck = false;
  settleAfterPrecheck = false;
});

describe("撤銷核准：帳本與批次都不刪（ADR 022 §2.1／§2.4）", () => {
  it("批次只標 revokedAt，原本的 GRANT 分錄仍在", async () => {
    await expect(revoke()).resolves.toBe(OvertimeDecisionOutcome.DECIDED);

    expect(grants).toHaveLength(1);
    expect(grants[0].revokedAt).toEqual(REVOKED_AT);
    expect(
      entries.some((entry) => entry.idempotencyKey === "overtime-grant:seg-1"),
    ).toBe(true);
  });

  /**
   * Info: (20260821 - Julian) 反向分錄的三個要點都釘住：型別、方向、扣後餘額。
   * 少了任何一個，帳本會說一個與事實不同的故事。
   */
  it("補一筆負向 ADJUST，扣後餘額為 0，且記得下操作者", async () => {
    await revoke();

    const reversal = entries.find(
      (entry) => entry.entryType === LeaveLedgerEntryType.ADJUST,
    );
    expect(reversal).toBeDefined();
    expect(reversal?.deltaMinutes).toBe(-120);
    expect(reversal?.grantBalanceAfterMinutes).toBe(0);
    expect(reversal?.actorEmployeeId).toBe(REVOKED_BY);
  });

  // Info: (20260821 - Julian) 帳本淨額歸零 —— ADR 022 §2.3 的守恆式仍然成立
  it("帳本淨額回到 0，餘額快取跟著重算", async () => {
    await revoke();

    const net = entries.reduce(
      (total, entry) => total + ((entry.deltaMinutes as number) ?? 0),
      0,
    );
    expect(net).toBe(0);
    expect(balances[0]?.remainingMinutes).toBe(0);
  });

  it("撤銷者與時點寫在單子上", async () => {
    await revoke();

    expect(requests[0].approvalRevokedAt).toEqual(REVOKED_AT);
    expect(requests[0].approvalRevokedByEmployeeId).toBe(REVOKED_BY);
    expect(requests[0].approvalRevokeCount).toBe(1);
  });

  /**
   * Info: (20260821 - Julian) **第二次撤銷不得被當成重放。**
   *
   * `idempotencyKey` 是唯一鍵，若鍵裡不含撤銷次數，第二次的反向分錄會撞上它 ——
   * 那一次撤銷是真的，帳本卻會少一筆，`Σ(deltaMinutes)` 與 `LeaveBalance`
   * 就此分岔。這裡模擬「撤銷 → 重新核准 → 再撤銷」。
   */
  it("撤銷 → 重新核准 → 再撤銷，第二筆反向分錄寫得進去", async () => {
    await revoke();

    // Info: (20260821 - Julian) 重新核准：新分段、新批次、新的 GRANT 分錄
    requests[0].status = "APPROVED";
    segments = [{ id: "seg-2", overtimeRequestId: REQUEST }];
    grants.push({
      id: "grant-2",
      accountBookId: BOOK,
      overtimeSegmentId: "seg-2",
      employeeId: "emp-006",
      leavePolicyId: POLICY,
      grantedMinutes: 120,
      revokedAt: null,
    });
    entries.push({
      id: "entry-3",
      leaveGrantId: "grant-2",
      entryType: LeaveLedgerEntryType.GRANT,
      deltaMinutes: 120,
      idempotencyKey: "overtime-grant:seg-2",
    });

    await expect(revoke()).resolves.toBe(OvertimeDecisionOutcome.DECIDED);

    const reversals = entries.filter(
      (entry) => entry.entryType === LeaveLedgerEntryType.ADJUST,
    );
    expect(reversals).toHaveLength(2);
    expect(new Set(reversals.map((one) => one.idempotencyKey)).size).toBe(2);
    expect(requests[0].approvalRevokeCount).toBe(2);

    /**
     * Info: (20260821 - Julian) **鍵裡真的含撤銷次數。**
     *
     * 只斷言「兩把鍵不同」殺不掉「鍵不含次數」那個突變 —— 重新核准會產生
     * 新的分段 id，光是分段就已經讓兩把鍵不同了。次數是**額外的**那道保險：
     * 分段 id 若哪天變成可重用的（例如分段改成軟刪除、或 grant 沒有分段連結
     * 而退回 `grant.id`），沒有次數的鍵就會撞上唯一鍵並被當成重放。
     *
     * 因此直接與產生器對答案，把意圖釘死在鍵的形狀上。
     */
    expect(reversals.map((one) => one.idempotencyKey)).toEqual([
      buildOvertimeRevokeIdempotencyKey("seg-1", 1),
      buildOvertimeRevokeIdempotencyKey("seg-2", 2),
    ]);
  });

  /**
   * Info: (20260821 - Julian) 被撤銷的批次不得再進 FIFO。
   *
   * 撤銷之後那批的餘額已經是 0（反向分錄），但**列還在**（ADR 022 §2.1）。
   * `consumableGrantWhere` 少了 `revokedAt: null` 的話，它仍會被掃進來，
   * `readConsumableGrants` 替它算出「可扣 0 分鐘」—— 症狀是請假時掃到批次
   * 卻一分鐘都扣不到，而畫面上沒有任何線索。
   *
   * 這裡釘的是**子句本身**（純函式，回一個 Prisma where）；FIFO 的行為
   * 那一側由 `leave_ledger_conservation.test.ts` 負責。
   */
  it("consumableGrantWhere 濾掉被撤銷的批次", () => {
    const where = consumableGrantWhere({
      accountBookId: BOOK,
      employeeId: "emp-006",
      leavePolicyId: POLICY,
      asOfDate: "2026-08-21",
    });

    expect(where.revokedAt).toBeNull();
  });
});

describe("撤銷核准：不可逆的邊界", () => {
  it("補休已被請掉時丟 OvertimeApprovalNotReversibleError", async () => {
    entries.push({
      id: "entry-2",
      leaveGrantId: "grant-1",
      entryType: LeaveLedgerEntryType.CONSUME,
      deltaMinutes: -60,
      idempotencyKey: "consume:day-1:grant-1",
    });

    await expect(revoke()).rejects.toBeInstanceOf(
      OvertimeApprovalNotReversibleError,
    );
  });

  /**
   * Info: (20260821 - Julian) 折現的連結數必須等於分段數（review 第 8 輪第 2 條）。
   *
   * 對不上只有一種成因：那些事件是 `overtime_segment_id` 這一欄上線之前建立的
   * （`IS NULL`，而 PostgreSQL 的 unique 不約束 NULL）。放行的話會留下孤兒事件，
   * 而重新核准時 `resolveCashOut` 又會為每個新分段各建一筆 —— 同一段付兩次。
   */
  it("PAYMENT 單有分段卻沒有連結的折現事件（舊列）→ 不可逆", async () => {
    requests[0].compensationMode = OvertimeCompensationMode.PAYMENT;
    grants = [];
    entries = [];
    // Info: (20260821 - Julian) 舊列：overtimeSegmentId 為 null，連結不到這張單
    cashOuts = [
      { id: "cash-legacy", overtimeSegmentId: null, settledAt: null },
    ];

    await expect(revoke()).rejects.toBeInstanceOf(
      OvertimeApprovalNotReversibleError,
    );
    // Info: (20260821 - Julian) 而且什麼都沒刪
    expect(cashOuts).toHaveLength(1);
    expect(segments).toHaveLength(1);
  });

  it("PAYMENT 單的折現事件逐段對得起來時，正常撤銷", async () => {
    requests[0].compensationMode = OvertimeCompensationMode.PAYMENT;
    grants = [];
    entries = [];
    cashOuts = [{ id: "cash-1", overtimeSegmentId: "seg-1", settledAt: null }];

    await expect(revoke()).resolves.toBe(OvertimeDecisionOutcome.DECIDED);
    expect(cashOuts).toHaveLength(0);
    expect(segments).toHaveLength(0);
  });

  /**
   * Info: (20260821 - Julian) **薪資在 count 與 deleteMany 之間結算**
   * （review 第 8 輪第 3 條）。
   *
   * 折現這一側沒有外鍵當後盾（補休那一側有 `onDelete: Restrict`），
   * 所以保護必須寫進刪除本身：`deleteMany({ …, settledAt: null })` 之後
   * 比對筆數。少了那個條件，這條路上沒有任何東西會觸發回滾。
   */
  it("薪資在預檢之後才結算 → 條件式刪除刪不到，撤銷被擋下", async () => {
    requests[0].compensationMode = OvertimeCompensationMode.PAYMENT;
    grants = [];
    entries = [];
    cashOuts = [{ id: "cash-1", overtimeSegmentId: "seg-1", settledAt: null }];
    settleAfterPrecheck = true;

    await expect(revoke()).rejects.toBeInstanceOf(
      OvertimeApprovalNotReversibleError,
    );
  });

  /**
   * Info: (20260821 - Julian) 預檢通過、更新當下才出現扣減 —— 這條路現在由
   * **餘額重算**吸收：反向分錄與那筆扣減都留在帳本上，`sumLedgerMinutes`
   * 算得出淨額。批次不再被刪，因此不必再依賴外鍵擋。
   *
   * 它仍然值得釘：撤銷不得把一筆已經發生的扣減弄丟。
   */
  it("預檢後才出現的扣減不會被弄丟", async () => {
    raceEntryAfterPrecheck = true;

    await revoke();

    expect(
      entries.some((entry) => entry.entryType === LeaveLedgerEntryType.CONSUME),
    ).toBe(true);
  });

  it("不在已核准時回 NOT_APPROVED，且什麼都不動", async () => {
    requests[0].status = "PENDING";

    await expect(revoke()).resolves.toBe(OvertimeDecisionOutcome.NOT_APPROVED);
    expect(grants[0].revokedAt).toBeNull();
    expect(segments).toHaveLength(1);
    expect(entries).toHaveLength(1);
  });
});

describe("撤銷核准：不得波及其他單子", () => {
  /**
   * Info: (20260821 - Julian) 這一組是為了第 8 輪第 4 條而存在。
   *
   * 上一版的替身有六支不看 `where`，於是「刪這一張」與「刪整張表」給出同一個
   * 結果 —— 而 `reachability` 那支的 fixture 在撤銷那一刻只有一張單持有分段，
   * 剛好也分不出來（§1.4）。這裡放兩張單，並斷言另一張**完全沒被動到**。
   */
  beforeEach(() => {
    requests.push({
      id: OTHER_REQUEST,
      accountBookId: BOOK,
      status: "APPROVED",
      compensationMode: OvertimeCompensationMode.COMPENSATORY_LEAVE,
      approvalRevokeCount: 0,
    });
    segments.push({ id: "seg-9", overtimeRequestId: OTHER_REQUEST });
    grants.push({
      id: "grant-9",
      accountBookId: BOOK,
      overtimeSegmentId: "seg-9",
      employeeId: "emp-007",
      leavePolicyId: POLICY,
      grantedMinutes: 240,
      revokedAt: null,
    });
    entries.push({
      id: "entry-9",
      leaveGrantId: "grant-9",
      entryType: LeaveLedgerEntryType.GRANT,
      deltaMinutes: 240,
      idempotencyKey: "overtime-grant:seg-9",
    });
    cashOuts.push({
      id: "cash-9",
      overtimeSegmentId: "seg-9",
      settledAt: null,
    });
  });

  it("撤銷 ot-1 之後，ot-2 的分段仍在", async () => {
    await revoke(REQUEST);

    expect(segments.map((one) => one.id)).toEqual(["seg-9"]);
  });

  it("撤銷 ot-1 之後，ot-2 的折現事件與批次都沒被動到", async () => {
    await revoke(REQUEST);

    expect(cashOuts.map((one) => one.id)).toEqual(["cash-9"]);
    const other = grants.find((one) => one.id === "grant-9");
    expect(other?.revokedAt).toBeNull();
    expect(
      entries.filter((entry) => entry.leaveGrantId === "grant-9"),
    ).toHaveLength(1);
  });

  // Info: (20260821 - Julian) 反向分錄只掛在被撤銷的那一批上
  it("反向分錄只掛在 ot-1 的批次上", async () => {
    await revoke(REQUEST);

    const reversals = entries.filter(
      (entry) => entry.entryType === LeaveLedgerEntryType.ADJUST,
    );
    expect(reversals).toHaveLength(1);
    expect(reversals[0].leaveGrantId).toBe("grant-1");
  });
});
