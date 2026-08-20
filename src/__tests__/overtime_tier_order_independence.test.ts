import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

/**
 * Info: (20260820 - Julian) 同日多張加班單的級距不得取決於**核准順序**
 * （review 第 5 輪 M4，第 8 輪的退化修正）。
 *
 * ## 為什麼既有的兩條測試抓不到
 *
 * `overtime_request_service.test.ts` 的那兩條把 `earlierRecognizedMinutes`
 * 當**輸入**餵給假 context，因此它們證明的是「引擎讀的是哪一欄」——
 * 不是「那一欄算得對」。替身替被測程式回答了問題（checklist §1.2 / §1.8），
 * 而錯的正是計算那一欄的那段查詢。
 *
 * 這一支因此把替身放在 **prisma** 那一層：`buildApprovalContext` 的每一行
 * 都真的執行，`earlierRecognizedMinutes` 由查詢算出來。
 *
 * ## 被修掉的退化
 *
 * 第一版把 `status = APPROVED` 與「開始得更早」以 AND 串在一起，於是
 * 「更早的那張還沒被核准」與「更早的那張不存在」給出同一個答案：
 *
 * ```
 * A = 17:00–19:00、B = 19:00–21:00，各 120 分
 * 先核 A 再核 B：1/3 + 2/3  ✅
 * 先核 B 再核 A：1/3 + 1/3  ❌ 少一段 §24 I 的 2/3 加成
 * ```
 */

const BOOK = "book-1";
const EMP = "emp-1";
const WORK_DATE = "2026-08-20";

/** Info: (20260820 - Julian) A 先開始（17:00–19:00），B 後開始（19:00–21:00） */
const A = { id: "ot-a", requestedStartMinute: 1020, requestedEndMinute: 1140 };
const B = { id: "ot-b", requestedStartMinute: 1140, requestedEndMinute: 1260 };

interface IRequestRow {
  id: string;
  accountBookId: string;
  employeeId: string;
  workDate: string;
  status: string;
  requestedStartMinute: number;
  requestedEndMinute: number;
  recognizedMinutes: number | null;
}

let rows: IRequestRow[] = [];

const rowOf = (
  spec: typeof A,
  status: string,
  recognizedMinutes: number | null,
): IRequestRow => ({
  id: spec.id,
  accountBookId: BOOK,
  employeeId: EMP,
  workDate: WORK_DATE,
  status,
  requestedStartMinute: spec.requestedStartMinute,
  requestedEndMinute: spec.requestedEndMinute,
  recognizedMinutes,
});

/**
 * Info: (20260820 - Julian) 只實作被測查詢**真的用到的**條件。
 *
 * 刻意不做成通用的 where 解譯器：一個「幾乎完整」的替身會讓人以為沒被測到
 * 的條件也被測到了。少任何一種，被測程式會當場算錯而不是安靜跳過。
 */
const matchesRequest = (
  row: IRequestRow,
  where: Record<string, unknown>,
): boolean => {
  if (where.accountBookId !== undefined && row.accountBookId !== where.accountBookId) return false;
  if (where.employeeId !== undefined && row.employeeId !== where.employeeId) return false;
  if (where.workDate !== undefined) {
    const clause = where.workDate as { gte?: string; lte?: string } | string;
    if (typeof clause === "string") {
      if (row.workDate !== clause) return false;
    } else {
      if (clause.gte !== undefined && row.workDate < clause.gte) return false;
      if (clause.lte !== undefined && row.workDate > clause.lte) return false;
    }
  }
  if (where.id !== undefined) {
    const clause = where.id as { not?: string };
    if (clause.not !== undefined && row.id === clause.not) return false;
  }
  if (where.status !== undefined) {
    const clause = where.status as { in?: string[] } | string;
    if (typeof clause === "string") {
      if (row.status !== clause) return false;
    } else if (Array.isArray(clause.in)) {
      if (!clause.in.includes(row.status)) return false;
    } else {
      throw new Error(`替身不支援這個 status 條件：${JSON.stringify(clause)}`);
    }
  }
  if (where.requestedStartMinute !== undefined) {
    const clause = where.requestedStartMinute as { lt?: number };
    if (clause.lt === undefined) {
      throw new Error("替身只支援 requestedStartMinute 的 lt");
    }
    if (!(row.requestedStartMinute < clause.lt)) return false;
  }
  return true;
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    overtimeRequest: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        rows.filter((row) => matchesRequest(row, where)),
      ),
      aggregate: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) => ({
          _sum: {
            recognizedMinutes: rows
              .filter((row) => matchesRequest(row, where))
              .reduce((total, row) => total + (row.recognizedMinutes ?? 0), 0),
          },
        }),
      ),
    },
    // Info: (20260820 - Julian) 排班：平日、8 小時、窗起 08:00
    employeeShiftDay: {
      findFirst: jest.fn(async () => ({
        dayType: "WORK",
        plannedWorkMinutes: null,
        shiftPattern: { windowStartMinute: 480, requiredWorkMinutes: 480 },
      })),
    },
    // Info: (20260820 - Julian) 無打卡 → 認列等於核准（自陳），與級距無關
    attendancePunch: { findMany: jest.fn(async () => []) },
    overtimePolicy: {
      findUnique: jest.fn(async () => ({
        extendedLimitAgreed: false,
        compensatoryExpiryMonths: 6,
      })),
    },
    leavePolicy: { findFirst: jest.fn(async () => ({ id: "policy-comp" })) },
  },
}));

import { overtimeRequestContextRepo } from "@/repositories/overtime_request_context.repo";
import { deriveOvertimeSegments } from "@/lib/overtime_rules";
import {
  OvertimePremiumTier,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import { WorkDayType } from "@/constants/attendance";

const contextFor = (spec: typeof A) =>
  overtimeRequestContextRepo.buildApprovalContext({
    accountBookId: BOOK,
    employeeId: EMP,
    workDate: WORK_DATE,
    excludeRequestId: spec.id,
    requestedStartMinute: spec.requestedStartMinute,
  });

/**
 * Info: (20260820 - Julian) 走完「算 context → 切段 → 落地」的一次核准。
 *
 * 切段用的是**真的** `deriveOvertimeSegments` —— 這一支測的是那一欄餵給它
 * 之後產出什麼級距，而不是那一欄本身等於幾。
 */
const approve = async (
  spec: typeof A,
  /**
   * Info: (20260820 - Julian) 核准當下**實際認列**幾分鐘（review 第 13 輪第 1 條）。
   *
   * 預設等於申請長度，但正式環境
   * `recognizedMinutes = min(核准, 打卡)`、`evidenceBasis` 預設 `PUNCH_RECORD`
   * —— **有打卡就常態小於申請區間**。第一版的 fixture 一律
   * `recognizedMinutes = 申請長度`，而那恰好是「順序依賴為 0」的唯一組態，
   * 也是生產資料裡最不常見的形狀（checklist §1.4 + §1.9）：
   * 測試因此看不到它要驗的那件事。
   */
  recognizedMinutes: number = spec.requestedEndMinute - spec.requestedStartMinute,
): Promise<OvertimePremiumTier[]> => {
  const context = await contextFor(spec);
  const segments = deriveOvertimeSegments({
    workDayType: context.workDayType as WorkDayType,
    isEmergency: false,
    minutes: recognizedMinutes,
    priorRecognizedMinutes: context.earlierRecognizedMinutes,
  });

  const row = rows.find((item) => item.id === spec.id);
  if (row === undefined) throw new Error(`fixture 少了 ${spec.id}`);
  row.status = OvertimeRequestStatus.APPROVED;
  row.recognizedMinutes = recognizedMinutes;

  return segments.map((segment) => segment.tier);
};

/** Info: (20260820 - Julian) A 申請 120 分，但當天只打卡 60 分 */
const A_PUNCHED_MINUTES = 60;

beforeEach(() => {
  rows = [
    rowOf(A, OvertimeRequestStatus.PENDING, null),
    rowOf(B, OvertimeRequestStatus.PENDING, null),
  ];
});

describe("同日兩張加班單：級距與核准順序無關（M4）", () => {
  /**
   * Info: (20260820 - Julian) 兩種順序各跑一次，比對**同一張單**拿到的級距。
   *
   * 這是本檔的紅線。第一版的實作在「先核 B」那一側會讓兩張單都拿 1/3，
   * 而總額因此少了一段 §24 I 的 2/3 加成。
   */
  it("先 A 再 B、與先 B 再 A，兩張單各自拿到同一組級距", async () => {
    const forward = { a: await approve(A), b: await approve(B) };

    // Info: (20260820 - Julian) 重置成兩張都還在待簽，換個順序再跑一次
    rows = [
      rowOf(A, OvertimeRequestStatus.PENDING, null),
      rowOf(B, OvertimeRequestStatus.PENDING, null),
    ];
    const reversed = { b: await approve(B), a: await approve(A) };

    expect(reversed.a).toEqual(forward.a);
    expect(reversed.b).toEqual(forward.b);
  });

  /**
   * Info: (20260820 - Julian) 而且那一組級距要是**對的**。
   *
   * 只驗「兩種順序相同」不夠：兩邊都算成 1/3 也會通過，
   * 而那正是要修的缺陷。期望值由 §24 I 推出來 ——
   * A 是當日的前兩小時（1/3），B 是第三、四小時（2/3）。
   */
  it.each([
    ["先 A 再 B", [A, B] as const],
    ["先 B 再 A", [B, A] as const],
  ])("%s：A 拿 1/3、B 拿 2/3", async (_label, order) => {
    const byId = new Map<string, OvertimePremiumTier[]>();
    for (const spec of order) byId.set(spec.id, await approve(spec));

    expect(byId.get(A.id)).toEqual([OvertimePremiumTier.WEEKDAY_FIRST_2H]);
    expect(byId.get(B.id)).toEqual([OvertimePremiumTier.WEEKDAY_BEYOND_2H]);
  });

  /**
   * Info: (20260820 - Julian) **A 的打卡短於申請時，順序仍然不得影響級距**
   * （review 第 13 輪第 1 條）。
   *
   * 這一條是本檔真正的紅線，而它在 2026-08-20 之前**會紅**：
   * 那時 `sumEarlierSameDayMinutes` 用的是
   * `recognizedMinutes ?? (requestedEnd - requestedStart)`，於是
   *
   * ```
   * 先核 A 再核 B：B 看到 A 的「認列 60」  → B = 1/3 + 2/3
   * 先核 B 再核 A：B 看到 A 的「申請 120」 → B = 整段 2/3
   * ```
   *
   * 差 20 個工資單位。修法是一律取申請長度 —— 級距因此是**申請本身的函數**，
   * 與誰先被核准、與打卡多寡都無關。
   */
  it("A 的打卡短於申請時，兩種順序仍給同一組級距", async () => {
    const forwardA = await approve(A, A_PUNCHED_MINUTES);
    const forwardB = await approve(B);

    rows = [
      rowOf(A, OvertimeRequestStatus.PENDING, null),
      rowOf(B, OvertimeRequestStatus.PENDING, null),
    ];
    const reversedB = await approve(B);
    const reversedA = await approve(A, A_PUNCHED_MINUTES);

    expect(reversedA).toEqual(forwardA);
    expect(reversedB).toEqual(forwardB);
  });

  /**
   * Info: (20260820 - Julian) 而且那一組級距要是**對的**。
   * B 排在 A（申請 17:00–19:00）之後，因此它整段都在第三小時之後。
   */
  it("A 打卡短時，B 仍整段落在 2/3", async () => {
    await approve(A, A_PUNCHED_MINUTES);
    expect(await approve(B)).toEqual([OvertimePremiumTier.WEEKDAY_BEYOND_2H]);
  });

  /**
   * Info: (20260820 - Julian) 待簽的單也要算進去 —— 這是修法的核心。
   *
   * 它還沒有 `recognizedMinutes`，因此取 `requestedEnd - requestedStart`
   * 當上界。少了這一條，實作退回「只數已核准」也會讓上面兩條在
   * 「先 A 再 B」那一側通過。
   */
  it("更早的那張還在待簽時，仍然算進本次的先前累計", async () => {
    const context = await contextFor(B);
    expect(context.earlierRecognizedMinutes).toBe(120);
  });

  /**
   * Info: (20260820 - Julian) 反方向：駁回與撤回的單**不算**。
   * 它們不是加班事實，算進去會把本次無故推到較高的級距。
   */
  it.each([
    [OvertimeRequestStatus.REJECTED],
    [OvertimeRequestStatus.WITHDRAWN],
  ])("更早的那張是 %s 時不算", async (status) => {
    rows = [rowOf(A, status, null), rowOf(B, OvertimeRequestStatus.PENDING, null)];

    const context = await contextFor(B);
    expect(context.earlierRecognizedMinutes).toBe(0);
  });

  /**
   * Info: (20260820 - Julian) 單日 12 小時的上限**仍然只數已核准的**。
   *
   * 兩件事共用同一張表卻是不同的問題：級距問「當天在此之前有多少延長工時」，
   * 上限問「這一天已經准了多少」。把待簽的算進上限，會讓一張還沒人簽的單
   * 把後面的單擋在門外。
   */
  it("待簽的單不進單日上限的累計", async () => {
    const context = await contextFor(B);

    expect(context.earlierRecognizedMinutes).toBe(120);
    expect(context.priorRecognizedMinutes).toBe(0);
  });
});
