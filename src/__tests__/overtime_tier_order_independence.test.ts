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
  // Info: (20260820 - Julian) 讓 `matchesRequest` 以鍵名取值；具名欄位仍逐一列出
  [key: string]: string | number | null;
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
 * Info: (20260820 - Julian) 只實作被測查詢真的用到的條件，**其餘一律丟例外**。
 *
 * ## 為什麼要丟，而不是忽略
 *
 * 第一版是一連串 `if (where.X !== undefined)`，於是**沒被列到的鍵會被安靜
 * 略過**。當被測查詢從 `requestedStartMinute: { lt }` 改成 `OR: [...]`（起點
 * 相同時以 id 決勝）之後，這支替身對起點完全不過濾 —— 每一列都命中，
 * A 因此看到 B 的 120 分而拿到 2/3。
 *
 * 諷刺的是第一版的註解就寫著「少任何一種，被測程式會當場算錯，不會安靜地
 * 跳過」—— 那句話當時是錯的，`if` 串本身就是安靜跳過。現在改成逐鍵分派，
 * 遇到不認得的鍵直接丟：替身跟不上被測查詢時，紅的是替身而不是斷言。
 *
 * 仍然刻意不做成通用的 Prisma where 解譯器：一個「幾乎完整」的替身會讓人
 * 以為沒被測到的條件也被測到了。
 */
type IWhereClause = Record<string, unknown>;

const matchesField = (actual: unknown, clause: unknown): boolean => {
  if (clause === null || typeof clause !== "object") return actual === clause;

  for (const [op, value] of Object.entries(clause as IWhereClause)) {
    switch (op) {
      case "lt":
        if (!(Number(actual) < Number(value))) return false;
        break;
      case "gt":
        if (!(Number(actual) > Number(value))) return false;
        break;
      case "gte":
        if ((actual as string) < (value as string)) return false;
        break;
      case "lte":
        if ((actual as string) > (value as string)) return false;
        break;
      case "not":
        if (actual === value) return false;
        break;
      case "in":
        if (!(value as unknown[]).includes(actual)) return false;
        break;
      default:
        throw new Error(`替身不支援這個運算子：${op}`);
    }
  }
  return true;
};

const ROW_FIELDS: readonly string[] = [
  "id",
  "accountBookId",
  "employeeId",
  "workDate",
  "status",
  "requestedStartMinute",
  "requestedEndMinute",
  "recognizedMinutes",
];

const matchesRequest = (row: IRequestRow, where: IWhereClause): boolean => {
  for (const [key, clause] of Object.entries(where)) {
    if (key === "OR") {
      if (!(clause as IWhereClause[]).some((one) => matchesRequest(row, one))) {
        return false;
      }
      continue;
    }
    if (key === "AND") {
      if (!(clause as IWhereClause[]).every((one) => matchesRequest(row, one))) {
        return false;
      }
      continue;
    }
    if (!ROW_FIELDS.includes(key)) {
      throw new Error(`替身不支援這個條件鍵：${key}`);
    }
    if (!matchesField(row[key], clause)) return false;
  }
  return true;
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    overtimeRequest: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        rows.filter((row) => matchesRequest(row, where)),
      ),
      /**
       * Info: (20260821 - Julian) `findLaterStartApprovedRequestId` 走的是這一支。
       *
       * **`orderBy` 真的排**，不是回第一個命中的。被測查詢寫了
       * `orderBy: { requestedStartMinute: "asc" }`，而替身若照 `rows` 的插入
       * 順序回傳，「回的是最早的那一張」就會由 fixture 的排列順序決定 ——
       * 測試綠燈，實際上什麼都沒釘住（checklist §1.2）。
       *
       * 同 `matchesRequest`：不認得的排序鍵直接丟，不安靜地忽略。
       */
      findFirst: jest.fn(
        async ({
          where,
          orderBy,
        }: {
          where: Record<string, unknown>;
          orderBy?: Record<string, string>;
        }) => {
          const hits = rows.filter((row) => matchesRequest(row, where));
          if (orderBy !== undefined) {
            const [[field, direction]] = Object.entries(orderBy);
            if (!ROW_FIELDS.includes(field)) {
              throw new Error(`替身不支援這個排序鍵：${field}`);
            }
            if (direction !== "asc" && direction !== "desc") {
              throw new Error(`替身不支援這個排序方向：${direction}`);
            }
            hits.sort((left, right) => {
              const a = left[field];
              const b = right[field];
              if (a === b) return 0;
              const ascending = (a as number) < (b as number) ? -1 : 1;
              return direction === "asc" ? ascending : -ascending;
            });
          }
          return hits[0] ?? null;
        },
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
  OVERTIME_PREMIUM,
  OVERTIME_TIER_BOUNDARY_MINUTES,
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

/**
 * Info: (20260821 - Julian) 觀測量換一個：**當日加成總額不得低於 §24 I 的下限**
 * （review 第 15 輪）。
 *
 * ## 為什麼上面那一組抓不到這件事
 *
 * 上面每一條的觀測量都是「兩種**核准**順序給同一組級距」。而「較晚的先核准、
 * 較早的事後補」這條路徑上，兩張都拿 1/3 是**唯一**的落地結果 —— 沒有第二種
 * 順序可以拿來比，那個觀測量照樣通過（checklist §1.9：測試量錯了東西，
 * 不是寫得不夠多）。
 *
 * 這裡改量錢：把落地的級距換算成工資單位，與一個**獨立算出來**的法定下限比。
 * 下限的算法只依 §24 I 的條文（前 2 小時 1/3、再延長 2/3），不碰被測的那條路。
 */
const RATE_OF = (tier: OvertimePremiumTier): number => {
  const ratio = OVERTIME_PREMIUM[tier];
  return ratio.numerator / ratio.denominator;
};

/**
 * Info: (20260821 - Julian) 落地的級距換算成工資單位。
 *
 * 本檔每一張單都是整段 120 分、不跨 2 小時邊界，因此**一張單只會有一段**。
 * 多於一段時直接丟：那代表 fixture 的形狀變了，此時把分鐘平均分攤到各段
 * 會算出一個看起來合理、實際上憑空編造的金額。
 */
const premiumUnitsOf = (
  landed: readonly { tiers: OvertimePremiumTier[]; minutes: number }[],
): number =>
  landed.reduce((total, one) => {
    if (one.tiers.length !== 1) {
      throw new Error(
        `本檔的換算只支援單一級距的單，收到 ${one.tiers.length} 段`,
      );
    }
    return total + one.minutes * RATE_OF(one.tiers[0]);
  }, 0);

/**
 * Info: (20260821 - Julian) 獨立的 oracle：§24 I 對**整天**的延長工時算一次。
 * 不看核准順序、不看單據怎麼切 —— 那正是被測那一側可能算錯的東西。
 */
const legalFloorUnitsOf = (totalMinutes: number): number => {
  const first = Math.min(totalMinutes, OVERTIME_TIER_BOUNDARY_MINUTES);
  return first * (1 / 3) + (totalMinutes - first) * (2 / 3);
};

const SPAN = 120;
const DAY_FLOOR_UNITS = legalFloorUnitsOf(SPAN * 2);

describe("同日兩張加班單：當日加成總額不得低於 §24 I 下限", () => {
  it.each([
    ["先 A 再 B", [A, B] as const],
    ["先 B 再 A", [B, A] as const],
  ])("%s：兩張都先送出時，總額等於下限 120", async (_label, order) => {
    const landed: { tiers: OvertimePremiumTier[]; minutes: number }[] = [];
    for (const spec of order) {
      landed.push({ tiers: await approve(spec), minutes: SPAN });
    }

    expect(premiumUnitsOf(landed)).toBeCloseTo(DAY_FLOOR_UNITS, 6);
    expect(DAY_FLOOR_UNITS).toBe(120);
  });

  /**
   * Info: (20260821 - Julian) 這道閘存在的理由，數字化。
   *
   * 級距在核准當下算一次就落地，而 `sumEarlierSameDayMinutes` 只看得到那一刻
   * **已經存在**的單。先核准 B（19:00–21:00）、A（17:00–19:00）事後才補進來：
   * B 永遠不知道 A，A 前面本來就沒有人 —— 兩張都從 0 起算、都拿 1/3。
   *
   * 這一條**刻意斷言那個錯的數字**（80，下限 120，少付 40）：它是
   * `VA_OVERTIME_EARLIER_THAN_APPROVED` 那道閘唯一的存在理由。
   * 哪一天它變紅了，代表核准當下已經改成對同日手足單重算 ——
   * 那時該做的是把那道閘一起移除（計畫書 §17 缺口 16），不是改這個數字。
   */
  it("事後補一張更早的單，總額會掉到 80（低於下限）—— 故送出端必須擋", async () => {
    rows = [rowOf(B, OvertimeRequestStatus.PENDING, null)];
    const landedB = await approve(B);

    // Info: (20260821 - Julian) A 此刻才被建立，B 已經定案
    rows.push(rowOf(A, OvertimeRequestStatus.PENDING, null));
    const landedA = await approve(A);

    expect(landedB).toEqual([OvertimePremiumTier.WEEKDAY_FIRST_2H]);
    expect(landedA).toEqual([OvertimePremiumTier.WEEKDAY_FIRST_2H]);
    expect(
      premiumUnitsOf([
        { tiers: landedB, minutes: SPAN },
        { tiers: landedA, minutes: SPAN },
      ]),
    ).toBeCloseTo(80, 6);
    expect(DAY_FLOOR_UNITS).toBe(120);
  });

  /**
   * Info: (20260821 - Julian) 因此送出端的那道閘必須看得到 B。
   * 這是 `submit()` 實際問的那一支查詢（真的 repository、真的 where）。
   */
  it("同日已核准且起點更晚時，查得到那一張", async () => {
    rows = [rowOf(B, OvertimeRequestStatus.APPROVED, SPAN)];

    await expect(
      overtimeRequestContextRepo.findLaterStartApprovedRequestId({
        accountBookId: BOOK,
        employeeId: EMP,
        workDate: WORK_DATE,
        requestedStartMinute: A.requestedStartMinute,
      }),
    ).resolves.toBe(B.id);
  });

  /**
   * Info: (20260821 - Julian) 反方向一：較晚那張**還在待簽**時不擋。
   * 它還沒定級距，在自己被核准的當下會重新讀一次 —— 擋它只會擋掉合法的並行送單。
   */
  it("較晚那張還在待簽時，不回報", async () => {
    rows = [rowOf(B, OvertimeRequestStatus.PENDING, null)];

    await expect(
      overtimeRequestContextRepo.findLaterStartApprovedRequestId({
        accountBookId: BOOK,
        employeeId: EMP,
        workDate: WORK_DATE,
        requestedStartMinute: A.requestedStartMinute,
      }),
    ).resolves.toBeNull();
  });

  /**
   * Info: (20260821 - Julian) 反方向二：已核准的那張**開始得更早**時不擋。
   * 那是正常順序 —— 本次落在它後面，級距讀得到它，算得出來。
   */
  it("已核准的那張開始得更早時，不回報", async () => {
    rows = [rowOf(A, OvertimeRequestStatus.APPROVED, SPAN)];

    await expect(
      overtimeRequestContextRepo.findLaterStartApprovedRequestId({
        accountBookId: BOOK,
        employeeId: EMP,
        workDate: WORK_DATE,
        requestedStartMinute: B.requestedStartMinute,
      }),
    ).resolves.toBeNull();
  });

  /**
   * Info: (20260821 - Julian) 撞到多張時回**起點最早**的那一張，而不是任意一張。
   *
   * 錯誤訊息之外，事後要查得出是撞到哪一張；「任意一張」會讓同一組資料在不同
   * 時候給出不同的答案。fixture 故意把晚的那張排在陣列前面 —— 少了
   * `orderBy` 的話這一條會回 `ot-c`。
   */
  it("同日有多張已核准且更晚時，回起點最早的那一張", async () => {
    const C = { id: "ot-c", requestedStartMinute: 1260, requestedEndMinute: 1380 };
    rows = [
      rowOf(C, OvertimeRequestStatus.APPROVED, SPAN),
      rowOf(B, OvertimeRequestStatus.APPROVED, SPAN),
    ];

    await expect(
      overtimeRequestContextRepo.findLaterStartApprovedRequestId({
        accountBookId: BOOK,
        employeeId: EMP,
        workDate: WORK_DATE,
        requestedStartMinute: A.requestedStartMinute,
      }),
    ).resolves.toBe(B.id);
  });
});
