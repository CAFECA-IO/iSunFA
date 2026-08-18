import { prisma } from "@/lib/prisma";
import { DEMO_TIME_ZONE, PunchType, WorkDayType } from "@/constants/attendance";
import { LEAVE_POLICY_CODE } from "@/constants/leave_policy";
import {
  OVERTIME_QUARTERLY_WINDOW_MONTHS,
  OvertimeCompensationMode,
  OvertimeEvidenceBasis,
  OvertimeFilingType,
  OvertimePremiumTier,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import {
  IOvertimeApprovalContext,
  IOvertimeRequestSummary,
} from "@/interfaces/overtime";
import { derivePunchIntervals } from "@/lib/overtime_rules";
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
    requiredWorkMinutes: number;
  } | null>;
  buildApprovalContext(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
    /** Info: (20260818 - Julian) 累計時要把本張單自己排除，否則它會把自己算進上限 */
    excludeRequestId: string;
  }): Promise<IOvertimeApprovalContext>;
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
       * Info: (20260818 - Julian) 應工作分鐘：有班別取班別，否則取固化的
       * `plannedWorkMinutes`（非上班日的持久來源，待辦甲-3 已補），都沒有才是 0。
       * 這個值進 `evaluateOvertimeLimits` 的「單日正常 + 延長 ≤ 12 小時」，
       * 取錯會讓上限檢查在休息日整個失效。
       */
      requiredWorkMinutes:
        row.shiftPattern?.requiredWorkMinutes ?? row.plannedWorkMinutes ?? 0,
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

  public async buildApprovalContext(params: {
    accountBookId: string;
    employeeId: string;
    workDate: string;
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
     * Info: (20260818 - Julian) 滾動三個月，含當日（`OVERTIME_QUARTERLY_WINDOW_IS_ROLLING`）。
     * 「三個月前的今天」再加一天才是窗的左界 —— 否則窗長會是三個月又一天。
     */
    const quarterStart = addIsoDays(
      addIsoMonths(params.workDate, -OVERTIME_QUARTERLY_WINDOW_MONTHS),
      1,
    );

    // Info: (20260818 - Julian) 三次加總共用同一組範圍鍵，只有期間不同
    const scope = {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      excludeRequestId: params.excludeRequestId,
    };

    const [
      priorRecognizedMinutes,
      priorMonthlyMinutes,
      priorQuarterlyMinutes,
      policy,
      compensatoryPolicy,
    ] = await Promise.all([
      sumRecognizedMinutes({
        ...scope,
        from: params.workDate,
        to: params.workDate,
      }),
      sumRecognizedMinutes({ ...scope, from: monthStart, to: monthEnd }),
      sumRecognizedMinutes({
        ...scope,
        from: quarterStart,
        to: params.workDate,
      }),
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
          : await this.findRecentWorkdayLength(params),
      punchIntervals,
      priorRecognizedMinutes,
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
