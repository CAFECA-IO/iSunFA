import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  IFakeWhere,
  matchesRow,
  sortRows,
} from "@/lib/testing/fake_prisma_where";

/**
 * Info: (20260821 - Julian) **沒有任何可達序列讓當日加成總額低於 §24 I 的下限**
 * （review 第 7 輪 B1）。
 *
 * ## 為什麼非要這一支不可
 *
 * 在它之前沒有任何測試同時碰到 `submit` 與 `approve`：
 *
 * - 級距側（`overtime_tier_order_independence.test.ts`）從 `approve` 證明
 *   「事後補一張更早的單會掉到 80」。
 * - 服務側（`overtime_request_service.test.ts`）從 `submit` 證明「那道閘會擋」。
 * - 中間那句「**所以**沒有任何可達序列低於下限」只寫在註解裡 ——
 *   而它是那道閘存在的全部理由。
 *
 * 第 7 輪 review 證明那句話當時是假的：閘的錯誤訊息叫人「撤回較晚那張、
 * 兩張一起重送」，而 `APPROVED` 是終端狀態（五個 `updateMany` 全部
 * `where.status = PENDING`），那個動作**做不到**。於是那 2 小時永久進不了
 * 系統：從「級距算錯、少付 40」變成「工時消失、少付 80」。
 *
 * 這一支走完整條路：`submit(B) → approve(B) → submit(A) 被擋 →
 * revokeApproval(B) → submit(A) → approve(A) → approve(B)`，
 * 最後拿**落地的分段**與一個獨立算出的法定下限比。
 *
 * ## 替身在 prisma 那一層
 *
 * 於是 service、`overtimeRequestRepo`、`overtimeRequestContextRepo`
 * 三層都跑真的。把 `revokeApproval` 換成假的來測「service 有沒有呼叫它」，
 * 證明的是接線而不是結果，而這一支要證的正是**結果**。
 *
 * 折換方式一律 `PAYMENT`：撤銷核准要還原的是分段與折現事件。
 * 補休那一條路徑（額度批次、帳本分錄、餘額快取、以及「已經被請掉就不准撤」
 * 的邊界）由 `overtime_revoke_approval.test.ts` 負責。
 */

const BOOK = "book-1";
const EMP = "emp-006";
const MANAGER = "emp-005";
const WORK_DATE = "2026-08-20";
const HOUR = 60;

/** Info: (20260821 - Julian) A 較早（17:00–19:00），B 較晚（19:00–21:00），各 120 分 */
const A = { start: 17 * HOUR, end: 19 * HOUR };
const B = { start: 19 * HOUR, end: 21 * HOUR };
const SPAN = 120;

interface IRequestRow {
  [key: string]: unknown;
  id: string;
  accountBookId: string;
  employeeId: string;
  /**
   * Info: (20260821 - Julian) `SUMMARY_SELECT` 用的是**巢狀 select**
   * （`employee: { select: { employeeNo, name } }`）與 `segments`，
   * 因此替身回的列必須是那個形狀，不是把欄位攤平。
   * 攤平的話 `toSummary` 讀 `row.employee.employeeNo` 會炸 —— 而那個紅燈
   * 指的是替身，不是產品。
   */
  employee: { employeeNo: string; name: string };
  workDate: string;
  status: string;
  filingType: string;
  compensationMode: string;
  evidenceBasis: string;
  requestedStartMinute: number;
  requestedEndMinute: number;
  reason: string;
  isEmergency: boolean;
  approvedMinutes: number | null;
  recognizedMinutes: number | null;
  createdAt: Date;
}

interface ISegmentRow {
  [key: string]: unknown;
  id: string;
  overtimeRequestId: string;
  order: number;
  tier: string;
  minutes: number;
}

interface ICashOutRow {
  [key: string]: unknown;
  id: string;
  overtimeSegmentId: string | null;
  settledAt: Date | null;
  minutes: number;
  premiumTier: string | null;
}

let requests: IRequestRow[] = [];
let segments: ISegmentRow[] = [];
let cashOuts: ICashOutRow[] = [];
let nextId = 0;

/**
 * Info: (20260821 - Julian) `where` 的比對器由 `@/lib/testing/fake_prisma_where`
 * 提供 —— **與 `overtime_revoke_approval.test.ts` 共用同一份**
 * （review 第 8 輪第 4 條）。
 *
 * 先前兩支各抄一份，而「兩支會不會分岔」本身就是新的失效點：這一支的比對器
 * 很嚴，那一支有六支方法根本不看 `where`，於是「刪這一張」與「刪整張表」
 * 在那邊塌成同一個值 —— 而那是本模組破壞性最強的一支端點。
 */
const REQUEST_FIELDS = [
  "id",
  "accountBookId",
  "employeeId",
  "workDate",
  "status",
  "requestedStartMinute",
  "requestedEndMinute",
  "recognizedMinutes",
  "isEmergency",
];
const SEGMENT_FIELDS = ["id", "overtimeRequestId", "revokedAt"];
const CASH_OUT_FIELDS = ["id", "overtimeSegmentId", "settledAt"];
/**
 * Info: (20260821 - Julian) 含 `accountBookId` / `employeeId` / `leavePolicyId`：
 * 餘額重算走的 `sumLedgerMinutes` 是用那三個欄位查批次的。
 */
const GRANT_FIELDS = [
  "id",
  "accountBookId",
  "employeeId",
  "leavePolicyId",
  "overtimeSegmentId",
  "revokedAt",
];

jest.mock("@/lib/prisma", () => {
  const client = {
    overtimeRequest: {
      findMany: jest.fn(async ({ where }: { where: IFakeWhere }) =>
        requests.filter((row) => matchesRow(row, where, REQUEST_FIELDS)),
      ),
      findFirst: jest.fn(
        async ({
          where,
          orderBy,
          select,
        }: {
          where: IFakeWhere;
          orderBy?: Record<string, string>;
          select?: { segments?: { where?: IFakeWhere } };
        }) => {
          /**
           * Info: (20260821 - Julian) `segments` 是**現算**的，而且**照被測程式
           * 傳進來的巢狀 `where` 過濾**（review 第 9 輪）。
           *
           * 第一版只用 `overtimeRequestId` 過濾，於是 `SUMMARY_SELECT` 那個
           * `where: { revokedAt: null }` 對替身完全不存在 —— 把它拿掉的突變
           * 是綠的。而它擋的是「一張被撤銷又重新核准的單同時帶著兩個世代的
           * 分段」，L28 的時數統計會因此加倍。
           */
          const segmentWhere = select?.segments?.where;
          const hits = requests
            .filter((row) => matchesRow(row, where, REQUEST_FIELDS))
            .map((row) => ({
              ...row,
              segments: segments
                .filter((one) => one.overtimeRequestId === row.id)
                .filter((one) =>
                  segmentWhere === undefined
                    ? true
                    : matchesRow(one, segmentWhere, SEGMENT_FIELDS),
                )
                .map(({ order, tier, minutes }) => ({ order, tier, minutes })),
            }));
          return sortRows(hits, orderBy, REQUEST_FIELDS)[0] ?? null;
        },
      ),
      aggregate: jest.fn(async ({ where }: { where: IFakeWhere }) => ({
        _sum: {
          recognizedMinutes: requests
            .filter((row) => matchesRow(row, where, REQUEST_FIELDS))
            .reduce(
              (total, row) => total + ((row.recognizedMinutes as number) ?? 0),
              0,
            ),
        },
      })),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        nextId += 1;
        const row = {
          ...(data as unknown as IRequestRow),
          id: `ot-${nextId}`,
          employee: { employeeNo: "EMP006", name: "李冠廷" },
          approvedMinutes: null,
          recognizedMinutes: null,
          /**
           * Info: (20260821 - Julian) 送出時刻＝`observedAt`（當地 22:00）。
           *
           * `approve` 的不變式拿 `createdAt` 當 `submittedAtMs`，並與
           * **申請區間的起點**（不是班別窗起）比 —— `POST_HOC` 要求送出
           * 晚於那個起點。給一個當地 08:00 的 `createdAt` 會讓兩張單都在
           * 核准時被擋，而那個紅燈指的是 fixture 不是產品。
           */
          // Info: (20260821 - Julian) 撤銷次數的起點；`{ increment: 1 }` 需要它是數字
          approvalRevokeCount: 0,
          createdAt: SUBMITTED_AT,
        };
        requests.push(row);
        return row;
      }),
      updateMany: jest.fn(
        async ({ where, data }: { where: IFakeWhere; data: IFakeWhere }) => {
          const hits = requests.filter((row) =>
            matchesRow(row, where, REQUEST_FIELDS),
          );
          for (const row of hits) {
            for (const [key, value] of Object.entries(data)) {
              // Info: (20260821 - Julian) `approvalRevokeCount: { increment: 1 }`
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
    },
    overtimeSegment: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        nextId += 1;
        const row = {
          ...(data as unknown as ISegmentRow),
          id: `seg-${nextId}`,
          // Info: (20260821 - Julian) 新建的分段一律是現役世代
          revokedAt: null,
          revokeSeq: 0,
        };
        segments.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where }: { where: IFakeWhere }) =>
        segments.filter((row) => matchesRow(row, where, SEGMENT_FIELDS)),
      ),
      /**
       * Info: (20260821 - Julian) 產品**不該再走這條路**（分段改為只標記），
       * 但替身仍要模擬 `onDelete: Restrict`：有人改回 `deleteMany` 就要當場紅。
       */
      deleteMany: jest.fn(async ({ where }: { where: IFakeWhere }) => {
        const doomed = segments.filter((row) =>
          matchesRow(row, where, SEGMENT_FIELDS),
        );
        const ids = new Set(doomed.map((row) => row.id));
        /**
         * Info: (20260821 - Julian) `overtimeSegmentId` 是 `string | null`
         * （補休屆期折現不來自加班分段），null 不指向任何分段 —— 明確排除，
         * 不用 `as string` 蓋過去：那會讓「null 算不算撞到」變成一個看不見的答案。
         */
        if (
          cashOuts.some(
            (one) =>
              one.overtimeSegmentId !== null && ids.has(one.overtimeSegmentId),
          )
        ) {
          throw new Error(
            "Foreign key constraint violated on the constraint: `leave_cash_out_event_overtime_segment_id_fkey`",
          );
        }
        segments = segments.filter((row) => !ids.has(row.id));
        return { count: doomed.length };
      }),
      updateMany: jest.fn(
        async ({ where, data }: { where: IFakeWhere; data: IFakeWhere }) => {
          const hits = segments.filter((row) =>
            matchesRow(row, where, SEGMENT_FIELDS),
          );
          for (const row of hits) Object.assign(row, data);
          return { count: hits.length };
        },
      ),
    },
    leaveCashOutEvent: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        nextId += 1;
        const row = {
          ...(data as unknown as ICashOutRow),
          id: `cash-${nextId}`,
          settledAt: null,
        };
        cashOuts.push(row);
        return row;
      }),
      count: jest.fn(
        async ({ where }: { where: IFakeWhere }) =>
          cashOuts.filter((row) => matchesRow(row, where, CASH_OUT_FIELDS))
            .length,
      ),
      deleteMany: jest.fn(async ({ where }: { where: IFakeWhere }) => {
        const keep = cashOuts.filter(
          (row) => !matchesRow(row, where, CASH_OUT_FIELDS),
        );
        const count = cashOuts.length - keep.length;
        cashOuts = keep;
        return { count };
      }),
    },
    /**
     * Info: (20260821 - Julian) 本檔一律走 `PAYMENT`，因此補休那三張表永遠是空的。
     * 仍然實作它們**並回空集合**，而不是省略：省略的話 `revokeApproval`
     * 走到那幾行會丟「不是函式」，而那個紅燈指的是替身不是產品。
     */
    /**
     * Info: (20260821 - Julian) 本檔一律走 `PAYMENT`，因此補休那三張表永遠是空的。
     * 仍然實作它們**並回空集合**，而不是省略：省略的話 `revokeApproval`
     * 走到那幾行會丟「不是函式」，而那個紅燈指的是替身不是產品。
     */
    leaveGrant: {
      findMany: jest.fn(async ({ where }: { where: IFakeWhere }) => {
        // Info: (20260821 - Julian) 條件仍然過一次比對器：不認得的鍵要當場丟
        matchesRow(
          {
            id: "",
            accountBookId: "",
            employeeId: "",
            leavePolicyId: "",
            overtimeSegmentId: null,
            revokedAt: null,
          },
          where,
          GRANT_FIELDS,
        );
        return [];
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    leaveLedgerEntry: {
      count: jest.fn(async () => 0),
      /**
       * Info: (20260821 - Julian) 逐批守恆會讀它（review 第二輪 R1）。
       * 本檔一律 PAYMENT，沒有補休批次，因此永遠是空的 ——
       * 但方法必須存在，否則撤銷路徑會在這裡 TypeError。
       */
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => {
        throw new Error("本檔一律 PAYMENT，不該有補休分錄");
      }),
    },
    // Info: (20260821 - Julian) 平日、8 小時、窗起 08:00
    employeeShiftDay: {
      findFirst: jest.fn(async () => ({
        dayType: "WORK",
        plannedWorkMinutes: null,
        shiftPattern: { windowStartMinute: 480, requiredWorkMinutes: 480 },
      })),
    },
    // Info: (20260821 - Julian) 無打卡 → 自陳，認列等於核准
    attendancePunch: { findMany: jest.fn(async () => []) },
    overtimePolicy: {
      findUnique: jest.fn(async () => ({
        extendedLimitAgreed: false,
        compensatoryExpiryMonths: 6,
      })),
    },
    leavePolicy: { findFirst: jest.fn(async () => ({ id: "policy-comp" })) },
    $transaction: jest.fn(
      async (run: (tx: unknown) => Promise<unknown>) => await run(client),
    ),
  };
  return { prisma: client };
});

import { overtimeRequestService } from "@/services/overtime_request.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { employeeRepo } from "@/repositories/employee.repo";
import {
  OVERTIME_PREMIUM,
  OVERTIME_TIER_BOUNDARY_MINUTES,
  OvertimeCompensationMode,
  OvertimeFilingType,
  OvertimePremiumTier,
} from "@/constants/overtime";

const managesSpy = jest.spyOn(employeeRepo, "managesEmployee");

/**
 * Info: (20260821 - Julian) 送出。`observedAt` 晚於班別窗起（08:00），
 * 因此 `POST_HOC` 合法 —— 事後補單是本模組的一級公民，不是邊角情形。
 */
const submit = (span: { start: number; end: number }) =>
  overtimeRequestService.submit({
    accountBookId: BOOK,
    employeeId: EMP,
    input: {
      workDate: WORK_DATE,
      filingType: OvertimeFilingType.POST_HOC,
      compensationMode: OvertimeCompensationMode.PAYMENT,
      requestedStartMinute: span.start,
      requestedEndMinute: span.end,
      reason: "工地趕澆置",
    },
    observedAt: SUBMITTED_AT,
  });

const approve = (requestId: string) =>
  overtimeRequestService.approve({
    accountBookId: BOOK,
    requestId,
    actorEmployeeId: MANAGER,
    observedAt: new Date("2026-08-20T14:30:00.000Z"),
  });

const revokeApproval = (requestId: string) =>
  overtimeRequestService.revokeApproval({
    accountBookId: BOOK,
    requestId,
    actorEmployeeId: MANAGER,
    observedAt: new Date("2026-08-20T15:00:00.000Z"),
  });

const codeOf = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (error) {
    if (error instanceof AppError) return error.apiCode;
    throw error;
  }
  throw new Error("預期會丟 AppError，但它成功了");
};

const rateOf = (tier: string): number => {
  const ratio = OVERTIME_PREMIUM[tier as OvertimePremiumTier];
  return ratio.numerator / ratio.denominator;
};

/** Info: (20260821 - Julian) 現役分段：撤銷過的留在表上，但不算錢 */
const liveSegments = (): ISegmentRow[] =>
  segments.filter((one) => one.revokedAt === null);

/** Info: (20260821 - Julian) 目前**落地**的分段換算成工資單位 */
const paidUnits = (): number =>
  liveSegments().reduce(
    (total, one) => total + one.minutes * rateOf(one.tier),
    0,
  );

/** Info: (20260821 - Julian) 目前**認列**的總分鐘（工時有沒有進到系統裡） */
const recognizedTotal = (): number =>
  requests
    .filter((row) => row.status === "APPROVED")
    .reduce((total, row) => total + (row.recognizedMinutes ?? 0), 0);

/**
 * Info: (20260821 - Julian) 獨立 oracle：§24 I 對**整天**的延長工時算一次。
 * 不看單據怎麼切、不看核准順序 —— 那正是被測那一側可能算錯的東西。
 */
const legalFloorUnits = (totalMinutes: number): number => {
  const first = Math.min(totalMinutes, OVERTIME_TIER_BOUNDARY_MINUTES);
  return first * (1 / 3) + (totalMinutes - first) * (2 / 3);
};

/** Info: (20260821 - Julian) 當地 22:00 送出 —— 晚於兩段的起點，`POST_HOC` 合法 */
const SUBMITTED_AT = new Date("2026-08-20T14:00:00.000Z");

const DAY_MINUTES = SPAN * 2;
const FLOOR = legalFloorUnits(DAY_MINUTES);

beforeEach(() => {
  requests = [];
  segments = [];
  cashOuts = [];
  nextId = 0;
  managesSpy.mockReset();
  managesSpy.mockResolvedValue(true);
});

describe("同日兩段加班：沒有可達序列讓總額低於 §24 I 下限", () => {
  it("法定下限是 120 個工資單位（兩段各 120 分）", () => {
    expect(FLOOR).toBe(120);
  });

  // Info: (20260821 - Julian) 對照組：兩張都先送出時本來就對
  it("兩張都先送出、依序核准 → 總額等於下限", async () => {
    const first = await submit(A);
    const second = await submit(B);
    await approve(first.id);
    await approve(second.id);

    expect(recognizedTotal()).toBe(DAY_MINUTES);
    expect(paidUnits()).toBeCloseTo(FLOOR, 6);
  });

  /**
   * Info: (20260821 - Julian) **這一條是 B1 的紅線**，也是本檔存在的理由。
   *
   * 較晚那張先被核准（當晚送、隔天早上批），較早那段之後才補 ——
   * 送出被擋，而錯誤訊息叫人「撤回較晚那張，兩張一起重送」。
   * 這裡就照那句話做一次，然後看結果。
   *
   * 在 `revokeApproval` 落地之前這一條會紅在第三步：`APPROVED` 是終端狀態，
   * 那個補救根本沒有執行者，於是 240 分的真實工時只有 120 分進得了系統
   * （實付 40，下限 120 —— 少付 80，比不擋還糟）。
   */
  it("較晚那張先核准、較早的事後補：照文案的補救走完，總額回到下限", async () => {
    const late = await submit(B);
    await approve(late.id);

    // Info: (20260821 - Julian) 第一步：閘擋下，且它擋的理由是級距會算錯
    expect(await codeOf(() => submit(A))).toBe(
      API_ERRORS.VA_OVERTIME_EARLIER_THAN_APPROVED.code,
    );
    expect(recognizedTotal()).toBe(SPAN);

    // Info: (20260821 - Julian) 第二步：照文案撤回較晚那一張
    await revokeApproval(late.id);
    /**
     * Info: (20260821 - Julian) 分段**不再被刪**，只標記（review 第 9 輪 B1）——
     * 刪它會撞上 `LeaveGrant` / `LeaveCashOutEvent` 的 `onDelete: Restrict`。
     */
    expect(liveSegments()).toHaveLength(0);
    expect(segments).toHaveLength(1);
    expect(cashOuts).toHaveLength(0);
    expect(recognizedTotal()).toBe(0);

    // Info: (20260821 - Julian) 第三步：兩張一起重送、重核
    const early = await submit(A);
    await approve(early.id);
    await approve(late.id);

    expect(recognizedTotal()).toBe(DAY_MINUTES);
    expect(paidUnits()).toBeCloseTo(FLOOR, 6);
  });

  /**
   * Info: (20260821 - Julian) 撤銷之後那張單**真的回到待簽**，不是被刪掉。
   *
   * 只斷言總額的話，一個把整張單刪掉再讓使用者重打的實作也會通過 ——
   * 而那會湮滅「他曾經送過、曾經被核准過」這件事。
   */
  /**
   * Info: (20260821 - Julian) 撤銷 → 重新核准之後，**摘要只帶現役世代**。
   *
   * 舊分段留在表上（不再實刪），`SUMMARY_SELECT` 的 `where: { revokedAt: null }`
   * 是唯一擋住「同一張單帶兩個世代」的東西 —— 少了它，L28 的時數統計加倍，
   * 而畫面與數字各自都不會顯示異常。
   */
  it("撤銷後重新核准，摘要只看得到新世代的分段", async () => {
    const late = await submit(B);
    await approve(late.id);
    await revokeApproval(late.id);
    const reapproved = await approve(late.id);

    // Info: (20260821 - Julian) 表上有兩個世代，摘要只該看到一個
    expect(segments).toHaveLength(2);
    expect(reapproved.request.segments).toHaveLength(1);
    expect(paidUnits()).toBeCloseTo(SPAN * (1 / 3), 6);
  });

  it("撤銷核准後單子回到待簽，且核准與認列分鐘都被清掉", async () => {
    const late = await submit(B);
    await approve(late.id);

    const row = requests.find((one) => one.id === late.id);
    expect(row?.status).toBe("APPROVED");
    expect(row?.approvedMinutes).toBe(SPAN);

    await revokeApproval(late.id);

    expect(row?.status).toBe("PENDING");
    expect(row?.approvedMinutes).toBeNull();
    expect(row?.recognizedMinutes).toBeNull();
  });

  /**
   * Info: (20260821 - Julian) 反方向：還在待簽的單沒有核准可以撤銷。
   *
   * 少了這一條，一個無條件成功的 `revokeApproval` 也會讓上面兩條通過，
   * 而它會把一張從未被核准的單「撤銷」成功 —— 畫面顯示已撤銷，
   * 實際上什麼都沒發生。
   */
  it("對待簽中的單撤銷核准 → VA_OVERTIME_NOT_APPROVED", async () => {
    const pending = await submit(B);

    expect(await codeOf(() => revokeApproval(pending.id))).toBe(
      API_ERRORS.VA_OVERTIME_NOT_APPROVED.code,
    );
    expect(requests[0].status).toBe("PENDING");
  });

  /**
   * Info: (20260821 - Julian) 撤銷與核准套用**同一組**決行者判斷。
   * 給撤銷比核准更寬的權限，等於開一條繞過核准權的路徑。
   */
  it("管不到這個人的人不能撤銷核准", async () => {
    const late = await submit(B);
    await approve(late.id);
    managesSpy.mockResolvedValue(false);

    expect(await codeOf(() => revokeApproval(late.id))).toBe(
      API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER.code,
    );
    expect(requests[0].status).toBe("APPROVED");
  });
});
