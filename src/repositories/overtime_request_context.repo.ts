import { prisma } from "@/lib/prisma";
import { DEMO_TIME_ZONE, PunchType, WorkDayType } from "@/constants/attendance";
import { LEAVE_POLICY_CODE } from "@/constants/leave_policy";
import {
  OvertimeCompensationMode,
  OvertimeEvidenceBasis,
  OvertimeFilingType,
  OvertimePremiumTier,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import {
  IMinuteInterval,
  IOvertimeApprovalContext,
  IOvertimeEmployeeRef,
  IOvertimeRequestSummary,
} from "@/interfaces/overtime";
import { derivePunchIntervals, quarterlyWindowOf } from "@/lib/overtime_rules";
import {
  addIsoDays,
  addIsoMonths,
  minutesFromWorkDateStart,
} from "@/lib/utils/attendance_time";

/**
 * Info: (20260818 - Julian) 加班單的**唯讀**查詢。
 *
 * 與 `overtime_request.repo.ts`（寫入）分開，理由同 `ILeaveRequestContext`：
 * 讀的部分在測試裡要造很多種組合，寫的部分只需要驗「有沒有照著算好的結果去寫」。
 *
 * ## 這裡不做任何判斷
 *
 * `buildApprovalContext` 把核准一張加班單需要的外部事實一次查齊 ——
 * 排班性質、應工作分鐘、打卡在場區間、三個期間的既有累計、帳本政策。
 * 「這些數字加起來合不合法」由引擎回答，「該丟哪一個錯誤碼」由 service 回答。
 *
 * ## 時區
 *
 * 打卡是絕對時點，加班區間是「當日 00:00 起算的分鐘數」，兩者之間的換算
 * 需要政策時區。Demo 期間是 `DEMO_TIME_ZONE` 常數，正式版為
 * `AttendancePolicy.timeZone`（計畫書 §13，待辦甲-2）。
 * ToDo: (20260818 - Julian) 帳本層級政策表落地後改讀該欄位。
 */

export interface IOvertimeRequestContext {
  findSummaryById(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<IOvertimeRequestSummary | null>;
  listByEmployee(params: {
    accountBookId: string;
    employeeId: string;
    from?: string;
    to?: string;
  }): Promise<IOvertimeRequestSummary[]>;
  /** Info: (20260818 - Julian) 該工作日的排班。沒有排班時為 null —— 那與「排了但不是上班日」不同 */
  findScheduledDay(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
  }): Promise<{
    dayType: WorkDayType;
    windowStartMinute: number | null;
    /**
     * Info: (20260820 - Julian) 這一天**依班別排定要工作**的分鐘數
     * （review 第 6 輪 M17）。非上班日一律 0 —— 那不是缺資料，
     * 是這一天本來就沒有正常工作時間。
     */
    requiredWorkMinutes: number;
    /**
     * Info: (20260820 - Julian) 「這天本來要上幾分鐘」的快照，僅非上班日有值，
     * 且既有列為 null（欄位本 PR 才加）。它回答的是「他的一天有多長」，
     * **不是**「這一天有多少正常工作時間」—— 兩者混用是 M17 的成因。
     */
    plannedWorkMinutes: number | null;
  } | null>;
  buildApprovalContext(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
    /** Info: (20260818 - Julian) 累計時要把本張單自己排除，否則它會把自己算進上限 */
    excludeRequestId: string;
    /**
     * Info: (20260820 - Julian) 本張單的起始分鐘。用來切出「當日開始得比它早」
     * 的那一份累計，級距依它定（review 第 5 輪 M4）。
     */
    requestedStartMinute: number;
  }): Promise<IOvertimeApprovalContext>;
  /**
   * Info: (20260818 - Julian) 指定員工集合的待簽加班單。
   *
   * 收 id 清單而不是主管 id：「誰歸我管」是 `employee.repo` 的職責，
   * 這裡只照著清單查（同 `listByEmployee` 不自己判斷可見範圍的理由）。
   */
  listPendingForApprover(params: {
    accountBookId: string;
    employeeIds: readonly string[];
  }): Promise<IOvertimeRequestSummary[]>;
  findEmployeeRef(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<IOvertimeEmployeeRef | null>;
  /** Info: (20260818 - Julian) 期間內已核准的加班單，含分段。L28 與 L29 共用 */
  findApprovedInRange(params: {
    accountBookId: string;
    employeeId: string;
    from: string;
    to: string;
  }): Promise<IApprovedOvertimeRow[]>;
  /** Info: (20260818 - Julian) 期間內逐日的在場區間。沒有成對打卡的日子不會出現在結果裡 */
  findPunchIntervalsByDate(params: {
    accountBookId: string;
    employeeId: string;
    from: string;
    to: string;
  }): Promise<Record<string, IMinuteInterval[]>>;
  /** Info: (20260818 - Julian) 期間內逐日的班別窗。非上班日無班別，窗為 null */
  findShiftWindowsByDate(params: {
    accountBookId: string;
    employeeId: string;
    from: string;
    to: string;
  }): Promise<Record<string, IScheduledWindow | undefined>>;
  findPolicy(accountBookId: string): Promise<IOvertimePolicyRow | null>;
}

/** Info: (20260818 - Julian) 已核准加班單的原始列。認列分鐘在核准時就固化了，這裡照抄 */
export interface IApprovedOvertimeRow {
  id: string;
  workDate: string;
  requestedStartMinute: number;
  requestedEndMinute: number;
  recognizedMinutes: number;
  evidenceBasis: OvertimeEvidenceBasis;
  segments: { tier: OvertimePremiumTier; minutes: number }[];
}

export interface IScheduledWindow {
  dayType: WorkDayType;
  /** Info: (20260818 - Julian) 非上班日為 null —— 那一天沒有「窗」可言 */
  windowStartMinute: number | null;
  windowEndMinute: number | null;
}

export interface IOvertimePolicyRow {
  extendedLimitAgreed: boolean;
  agreementRecordUrl: string | null;
  agreedAt: Date | null;
  compensatoryExpiryMonths: number | null;
}

/** Info: (20260818 - Julian) Prisma 回的是字面量聯集，顯式轉回鏡像 enum（同 `findSchedules` 的處置） */
const toSummary = (row: {
  id: string;
  employeeId: string;
  workDate: string;
  filingType: string;
  compensationMode: string;
  evidenceBasis: string;
  requestedStartMinute: number;
  requestedEndMinute: number;
  approvedMinutes: number | null;
  recognizedMinutes: number | null;
  reason: string;
  status: string;
  isEmergency: boolean;
  emergencyReportUrl: string | null;
  emergencyReportedAt: Date | null;
  createdAt: Date;
  employee: { employeeNo: string; name: string };
  segments: { order: number; tier: string; minutes: number }[];
}): IOvertimeRequestSummary => ({
  id: row.id,
  employeeId: row.employeeId,
  employeeNo: row.employee.employeeNo,
  employeeName: row.employee.name,
  workDate: row.workDate,
  filingType: row.filingType as OvertimeFilingType,
  compensationMode: row.compensationMode as OvertimeCompensationMode,
  evidenceBasis: row.evidenceBasis as OvertimeEvidenceBasis,
  requestedStartMinute: row.requestedStartMinute,
  requestedEndMinute: row.requestedEndMinute,
  approvedMinutes: row.approvedMinutes,
  recognizedMinutes: row.recognizedMinutes,
  reason: row.reason,
  status: row.status as OvertimeRequestStatus,
  isEmergency: row.isEmergency,
  /**
   * Info: (20260819 - Julian) 報備紀錄一併帶出來（review B7）。
   * 只給「有沒有」不夠 —— 畫面上一個寫著「天災事變·加倍發給」的標記，
   * 若點不進那份紀錄，看的人沒有辦法判斷它是不是真的報備過。
   * 認定者（`emergencyDeclaredByEmployeeId`）不外拋：它是內部稽核用的，
   * 而清單是同事之間看得到的（可見範圍分級見 `overtime_visibility.ts`）。
   */
  emergencyReportUrl: row.emergencyReportUrl,
  emergencyReportedAt: row.emergencyReportedAt?.toISOString() ?? null,
  segments: row.segments
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((segment) => ({
      order: segment.order,
      tier: segment.tier as OvertimePremiumTier,
      minutes: segment.minutes,
    })),
  createdAt: row.createdAt.toISOString(),
});

const SUMMARY_SELECT = {
  id: true,
  employeeId: true,
  workDate: true,
  filingType: true,
  compensationMode: true,
  evidenceBasis: true,
  requestedStartMinute: true,
  requestedEndMinute: true,
  approvedMinutes: true,
  recognizedMinutes: true,
  reason: true,
  status: true,
  isEmergency: true,
  emergencyReportUrl: true,
  emergencyReportedAt: true,
  createdAt: true,
  employee: { select: { employeeNo: true, name: true } },
  segments: { select: { order: true, tier: true, minutes: true } },
} as const;

/**
 * Info: (20260818 - Julian) 某段工作日區間內、已核准的認列分鐘加總。
 *
 * 只算 `APPROVED`：待簽與已駁回的單子不是加班事實。**`workDate` 是字串，
 * 字典序即日期序**，可直接 gte/lte（同 `findByWorkDateRange` 的既有作法）。
 */
const sumRecognizedMinutes = async (params: {
  accountBookId: string;
  employeeId: string;
  from: string;
  to: string;
  excludeRequestId: string;
}): Promise<number> => {
  const aggregate = await prisma.overtimeRequest.aggregate({
    where: {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      status: OvertimeRequestStatus.APPROVED,
      workDate: { gte: params.from, lte: params.to },
      id: { not: params.excludeRequestId },
    },
    _sum: { recognizedMinutes: true },
  });
  return aggregate._sum.recognizedMinutes ?? 0;
};

/**
 * Info: (20260820 - Julian) 當日**開始得比本次早**的加班分鐘（review 第 5 輪 M4，
 * 第 8 輪修正）。
 *
 * ## 為什麼不是在 `sumRecognizedMinutes` 上加一個條件
 *
 * 第一版就是那樣做的，而它把 `status = APPROVED` 與「開始得更早」**以 AND
 * 串在一起** —— 於是「更早的那一張還沒被核准」與「更早的那一張不存在」
 * 變成同一個答案。同日兩張不重疊的單 A(17:00–19:00)、B(19:00–21:00)：
 *
 * ```
 * 先核 A 再核 B：A earlier=0 → 1/3；B earlier=120 → 2/3     ✅
 * 先核 B 再核 A：B earlier=0 → 1/3；A earlier=0  → 1/3     ❌ 少一段 2/3
 * ```
 *
 * 而分段在核准當下算一次就落地，同日手足單**不會被重算**（更正流程尚未實作）。
 * 舊碼的缺陷是**歸屬錯**（總額仍是 1/3 + 2/3），這個第一版的缺陷是
 * **總額少一段 §24 I 的 2/3 加成** —— 前者是帳面難看，後者是少付工資。
 *
 * ## 判準：級距是「時間」的屬性，不是「核准狀態」的屬性
 *
 * §24 I 說的是「延長工作時間在二小時以內者」加給 1/3、「再延長」加給 2/3。
 * 那個「二小時以內」數的是**當天在此之前的延長工時**，與誰先簽名無關。
 * 因此這一支收 `PENDING` 與 `APPROVED` 兩種狀態，`REJECTED` / `WITHDRAWN`
 * 不算（它們不是加班事實）。
 *
 * ## 待簽的單用什麼分鐘數
 *
 * 它還沒有 `recognizedMinutes`（要核准當下才算得出來），因此取
 * `requestedEnd - requestedStart` 當**上界**。方向要說清楚：
 *
 * - 上界偏大 → 本次被推到較高的級距 → **對勞工有利**。
 * - 那張待簽單日後被駁回 → 本次的級距回頭看是偏高的，
 *   而那筆錢已經發出去了。同樣對勞工有利，且不違法（給高於法定下限）。
 *
 * 反方向（少算）才是不能接受的那一個：它直接低於 §24 I 的法定下限。
 * 兩種偏差都會存在，選擇的是哪一邊 —— 而只有一邊會被勞檢開罰。
 *
 * ToDo: (20260820 - Julian) 更正流程（撤銷核准並重算）落地之後，
 * 這裡可以改成「核准當下對同日手足單一併重算」，兩種偏差就都消失。
 */
const sumEarlierSameDayMinutes = async (params: {
  accountBookId: string;
  employeeId: string;
  workDate: string;
  excludeRequestId: string;
  requestedStartMinute: number;
}): Promise<number> => {
  const rows = await prisma.overtimeRequest.findMany({
    where: {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      workDate: params.workDate,
      id: { not: params.excludeRequestId },
      status: {
        in: [OvertimeRequestStatus.PENDING, OvertimeRequestStatus.APPROVED],
      },
      /**
       * Info: (20260820 - Julian) `lt` 而非 `lte`：起始分鐘相同的兩張單是
       * 重疊的加班，那是另一個問題（重疊本身該擋）。用 `lte` 只會讓其中一張
       * 把另一張算進自己的先前累計，而兩張互相算就都被推高一級。
       */
      requestedStartMinute: { lt: params.requestedStartMinute },
    },
    select: {
      recognizedMinutes: true,
      requestedStartMinute: true,
      requestedEndMinute: true,
    },
  });

  return rows.reduce(
    (total, row) =>
      total +
      (row.recognizedMinutes ??
        row.requestedEndMinute - row.requestedStartMinute),
    0,
  );
};

class OvertimeRequestContextRepository implements IOvertimeRequestContext {
  public async findSummaryById(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<IOvertimeRequestSummary | null> {
    const row = await prisma.overtimeRequest.findFirst({
      where: { id: params.requestId, accountBookId: params.accountBookId },
      select: SUMMARY_SELECT,
    });
    return row === null ? null : toSummary(row);
  }

  public async listByEmployee(params: {
    accountBookId: string;
    employeeId: string;
    from?: string;
    to?: string;
  }): Promise<IOvertimeRequestSummary[]> {
    const rows = await prisma.overtimeRequest.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        ...(params.from || params.to
          ? {
              workDate: {
                ...(params.from ? { gte: params.from } : {}),
                ...(params.to ? { lte: params.to } : {}),
              },
            }
          : {}),
      },
      select: SUMMARY_SELECT,
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toSummary);
  }

  public async findScheduledDay(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
  }): Promise<{
    dayType: WorkDayType;
    windowStartMinute: number | null;
    requiredWorkMinutes: number;
    plannedWorkMinutes: number | null;
  } | null> {
    const row = await prisma.employeeShiftDay.findFirst({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        workDate: params.workDate,
      },
      select: {
        dayType: true,
        plannedWorkMinutes: true,
        shiftPattern: {
          select: { windowStartMinute: true, requiredWorkMinutes: true },
        },
      },
    });
    if (row === null) return null;

    return {
      dayType: row.dayType as WorkDayType,
      // Info: (20260818 - Julian) 非上班日必無班別（`assertSchedulableDay` 保證），窗起因此為 null
      windowStartMinute: row.shiftPattern?.windowStartMinute ?? null,
      /**
       * Info: (20260820 - Julian) 正常工作時間**只看班別**（review 第 6 輪 M17）。
       *
       * ## 原本的式子與它真正的毛病
       *
       * ```ts
       * row.shiftPattern?.requiredWorkMinutes ?? row.plannedWorkMinutes ?? 0
       * ```
       *
       * 它進的是 `evaluateOvertimeLimits` 的「單日正常＋延長 ≤ 12 小時」
       * （§32 II）。非上班日必無班別，於是這一天的上限取決於
       * `plannedWorkMinutes` 有沒有值 —— 而那個欄位是本 PR 才加的，
       * **既有列一律 null**。同一種日子、同一個人，上限是 12 小時還是
       * 12 減 8 小時，只取決於那一列是這次上線前還是上線後寫的。
       *
       * 那個不一致才是缺陷，而不是「該取 0 還是該取 480」。
       *
       * ## 為什麼定案是 0
       *
       * §32 II 算的是「延長之工作時間**連同正常工作時間**」。休息日、國定假日
       * 沒有排定的正常工作時間，整個 12 小時都給延長工時 —— 那正是 §24 II
       * 休息日出勤的常態。請假日同理：請假的那幾小時不是工作時間。
       * `plannedWorkMinutes` 回答的是另一個問題（「他的一天有多長」，
       * 供半天假換算與補休折換），它照原樣往下傳，由需要它的人自己取。
       */
      requiredWorkMinutes: row.shiftPattern?.requiredWorkMinutes ?? 0,
      plannedWorkMinutes: row.plannedWorkMinutes,
    };
  }

  /**
   * Info: (20260818 - Julian) 該員最近一個有班別的上班日長度（含當日往前找）。
   *
   * 休息日與國定假日沒有班別，而補休批次仍需要一個「一天有多長」才驗算得了
   * （`assertGrantSource`）。往前找而不是取帳本平均：班別是掛在人身上的，
   * 辦公室 450 分鐘、現場 480 分鐘，取平均會讓兩邊的天數都不對。
   */
  private async findRecentWorkdayLength(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
  }): Promise<number | null> {
    const row = await prisma.employeeShiftDay.findFirst({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        workDate: { lte: params.workDate },
        shiftPatternId: { not: null },
      },
      orderBy: { workDate: "desc" },
      select: { shiftPattern: { select: { requiredWorkMinutes: true } } },
    });
    return row?.shiftPattern?.requiredWorkMinutes ?? null;
  }

  public async listPendingForApprover(params: {
    accountBookId: string;
    employeeIds: readonly string[];
  }): Promise<IOvertimeRequestSummary[]> {
    // Info: (20260818 - Julian) 空清單代表「他沒有管任何人」，不是「查全部」
    if (params.employeeIds.length === 0) return [];

    const rows = await prisma.overtimeRequest.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: { in: [...params.employeeIds] },
        status: OvertimeRequestStatus.PENDING,
      },
      select: SUMMARY_SELECT,
      // Info: (20260818 - Julian) 舊的排前面：等最久的單子最該先被處理
      orderBy: [{ workDate: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toSummary);
  }

  public async findEmployeeRef(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<IOvertimeEmployeeRef | null> {
    const row = await prisma.employee.findFirst({
      where: { id: params.employeeId, accountBookId: params.accountBookId },
      select: { id: true, employeeNo: true, name: true },
    });
    return row === null
      ? null
      : {
          employeeId: row.id,
          employeeNo: row.employeeNo,
          employeeName: row.name,
        };
  }

  public async findApprovedInRange(params: {
    accountBookId: string;
    employeeId: string;
    from: string;
    to: string;
  }): Promise<IApprovedOvertimeRow[]> {
    const rows = await prisma.overtimeRequest.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        status: OvertimeRequestStatus.APPROVED,
        workDate: { gte: params.from, lte: params.to },
      },
      select: {
        id: true,
        workDate: true,
        requestedStartMinute: true,
        requestedEndMinute: true,
        recognizedMinutes: true,
        evidenceBasis: true,
        segments: { select: { tier: true, minutes: true } },
      },
      orderBy: [{ workDate: "asc" }, { requestedStartMinute: "asc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      workDate: row.workDate,
      requestedStartMinute: row.requestedStartMinute,
      requestedEndMinute: row.requestedEndMinute,
      /**
       * Info: (20260818 - Julian) 已核准者必有認列分鐘（`assertOvertimeFilingType` 擋著）。
       * `?? 0` 是型別上的收尾，不是對缺值的容忍 —— 真的缺了，統計會少算而不是崩掉，
       * 而那筆單子本身已經違反不變式，該由勾稽去抓。
       */
      recognizedMinutes: row.recognizedMinutes ?? 0,
      evidenceBasis: row.evidenceBasis as OvertimeEvidenceBasis,
      segments: row.segments.map((segment) => ({
        tier: segment.tier as OvertimePremiumTier,
        minutes: segment.minutes,
      })),
    }));
  }

  public async findPunchIntervalsByDate(params: {
    accountBookId: string;
    employeeId: string;
    from: string;
    to: string;
  }): Promise<Record<string, IMinuteInterval[]>> {
    const punches = await prisma.attendancePunch.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        workDate: { gte: params.from, lte: params.to },
      },
      select: { workDate: true, punchType: true, punchedAt: true },
      orderBy: { punchedAt: "asc" },
    });

    const byDate = new Map<
      string,
      { punchType: PunchType; minuteOfDay: number }[]
    >();
    for (const punch of punches) {
      const bucket = byDate.get(punch.workDate) ?? [];
      bucket.push({
        punchType: punch.punchType as PunchType,
        minuteOfDay: minutesFromWorkDateStart(
          punch.punchedAt,
          punch.workDate,
          DEMO_TIME_ZONE,
        ),
      });
      byDate.set(punch.workDate, bucket);
    }

    return Object.fromEntries(
      [...byDate.entries()].map(([workDate, bucket]) => [
        workDate,
        derivePunchIntervals(bucket),
      ]),
    );
  }

  public async findShiftWindowsByDate(params: {
    accountBookId: string;
    employeeId: string;
    from: string;
    to: string;
  }): Promise<Record<string, IScheduledWindow | undefined>> {
    const rows = await prisma.employeeShiftDay.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        workDate: { gte: params.from, lte: params.to },
      },
      select: {
        workDate: true,
        dayType: true,
        shiftPattern: {
          select: { windowStartMinute: true, windowEndMinute: true },
        },
      },
    });

    return Object.fromEntries(
      rows.map((row) => [
        row.workDate,
        {
          dayType: row.dayType as WorkDayType,
          windowStartMinute: row.shiftPattern?.windowStartMinute ?? null,
          windowEndMinute: row.shiftPattern?.windowEndMinute ?? null,
        },
      ]),
    );
  }

  public async findPolicy(
    accountBookId: string,
  ): Promise<IOvertimePolicyRow | null> {
    return prisma.overtimePolicy.findUnique({
      where: { accountBookId },
      select: {
        extendedLimitAgreed: true,
        agreementRecordUrl: true,
        agreedAt: true,
        compensatoryExpiryMonths: true,
      },
    });
  }

  public async buildApprovalContext(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
    requestedStartMinute: number;
    excludeRequestId: string;
  }): Promise<IOvertimeApprovalContext> {
    const scheduled = await this.findScheduledDay(params);

    const punches = await prisma.attendancePunch.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        workDate: params.workDate,
      },
      select: { punchType: true, punchedAt: true },
      orderBy: { punchedAt: "asc" },
    });

    const punchIntervals = derivePunchIntervals(
      punches.map((punch) => ({
        punchType: punch.punchType as PunchType,
        minuteOfDay: minutesFromWorkDateStart(
          punch.punchedAt,
          params.workDate,
          DEMO_TIME_ZONE,
        ),
      })),
    );

    const monthStart = `${params.workDate.slice(0, 7)}-01`;
    const monthEnd = addIsoDays(addIsoMonths(monthStart, 1), -1);
    /**
     * Info: (20260820 - Julian) 窗界由 `quarterlyWindowOf` 給（review 第 5 輪 M5）。
     * 這段算式先前在這裡與月報表各有一份手抄本，而兩份給出不同的左端。
     */
    const quarter = quarterlyWindowOf(params.workDate);

    // Info: (20260818 - Julian) 三次加總共用同一組範圍鍵，只有期間不同
    const scope = {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      excludeRequestId: params.excludeRequestId,
    };

    const [
      priorRecognizedMinutes,
      earlierRecognizedMinutes,
      priorMonthlyMinutes,
      priorQuarterlyMinutes,
      policy,
      compensatoryPolicy,
    ] = await Promise.all([
      /**
       * Info: (20260818 - Julian) 當日全部（單日 12 小時上限用）——
       * 那道閘與時段先後無關。
       */
      sumRecognizedMinutes({
        ...scope,
        from: params.workDate,
        to: params.workDate,
      }),
      /**
       * Info: (20260820 - Julian) 當日**開始得比本次早**的那些（級距用，review 第 5 輪 M4）。
       * 它收 `PENDING` 與 `APPROVED` 兩種狀態 —— 理由見
       * `sumEarlierSameDayMinutes` 的檔頭（級距是時間的屬性，不是核准狀態的）。
       */
      sumEarlierSameDayMinutes({
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        workDate: params.workDate,
        excludeRequestId: params.excludeRequestId,
        requestedStartMinute: params.requestedStartMinute,
      }),
      sumRecognizedMinutes({ ...scope, from: monthStart, to: monthEnd }),
      sumRecognizedMinutes({ ...scope, from: quarter.from, to: quarter.to }),
      prisma.overtimePolicy.findUnique({
        where: { accountBookId: params.accountBookId },
        select: {
          extendedLimitAgreed: true,
          compensatoryExpiryMonths: true,
        },
      }),
      prisma.leavePolicy.findFirst({
        where: {
          accountBookId: params.accountBookId,
          code: LEAVE_POLICY_CODE.COMPENSATORY,
          isActive: true,
        },
        select: { id: true },
      }),
    ]);

    return {
      // Info: (20260818 - Julian) 沒有排班就是 null，不挑一個日別頂替
      workDayType: scheduled?.dayType ?? null,
      regularWorkMinutes: scheduled?.requiredWorkMinutes ?? 0,
      compensatoryDayEquivalentMinutes:
        scheduled !== null && scheduled.requiredWorkMinutes > 0
          ? scheduled.requiredWorkMinutes
          : /**
             * Info: (20260820 - Julian) 非上班日先問那一天自己的快照
             * （review 第 6 輪 M17）。
             *
             * `plannedWorkMinutes` 是投影當下固化的「這天本來要上幾分鐘」——
             * 比「最近一個有班別的上班日」更貼近事實（那個人可能上週才換班別）。
             * 既有列為 null 時才往前找，那是這個欄位補上之前唯一的來源。
             */
            (scheduled?.plannedWorkMinutes ??
            (await this.findRecentWorkdayLength(params))),
      punchIntervals,
      priorRecognizedMinutes,
      earlierRecognizedMinutes,
      priorMonthlyMinutes,
      priorQuarterlyMinutes,
      /**
       * Info: (20260818 - Julian) 沒有政策列即視為未同意放寬（46 小時）。
       * 這是唯一安全的預設：把「沒設定」讀成「已同意」會多放 8 小時，
       * 而那 8 小時沒有任何記載可以佐證。
       */
      extendedLimitAgreed: policy?.extendedLimitAgreed ?? false,
      compensatoryPolicyId: compensatoryPolicy?.id ?? null,
      compensatoryExpiryMonths: policy?.compensatoryExpiryMonths ?? null,
    };
  }
}

export const overtimeRequestContextRepo: IOvertimeRequestContext =
  new OvertimeRequestContextRepository();
