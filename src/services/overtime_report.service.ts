import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { DEMO_ATTENDANCE_MAX_RANGE_DAYS } from "@/constants/attendance";
import {
  OVERTIME_QUARTERLY_WINDOW_MONTHS,
  overtimeLimitsOf,
  OvertimeEvidenceBasis,
  OvertimeExceptionType,
  OvertimePremiumTier,
} from "@/constants/overtime";
import {
  IMinuteInterval,
  IOvertimeEmployeeRef,
  IOvertimeExceptionReport,
  IOvertimeExceptionView,
  IOvertimeSummaryView,
  IOvertimeTierTotal,
} from "@/interfaces/overtime";
import { subtractIntervals, totalIntervalMinutes } from "@/lib/overtime_rules";
import {
  addIsoDays,
  addIsoMonths,
  enumerateIsoDates,
  isoDaySpan,
} from "@/lib/utils/attendance_time";
import {
  IOvertimeRequestContext,
  overtimeRequestContextRepo,
} from "@/repositories/overtime_request_context.repo";
import { assertMayViewOvertimeOf } from "@/services/overtime_visibility";

/**
 * Info: (20260818 - Julian) 加班的查詢類端點（L28 統計、L29 未核准時段）。
 *
 * 與 `overtime_request.service` 分開：那一支負責改變狀態，這一支不寫任何東西。
 * 混在一起會讓「這支端點會不會動到資料」變成要讀完整個檔案才答得出來的問題。
 */

export class OvertimeReportService {
  constructor(private readonly context: IOvertimeRequestContext) {}

  /**
   * Info: (20260818 - Julian) L28：加班時數統計（月／季，含上限使用率）。
   *
   * 佐證來源分兩欄：勞動檢查會問「你們有多少加班沒有出勤紀錄佐證」，
   * 而一個答不出這題的系統等於默認全部都是（ADR 024 §2.2）。
   */
  public async summarize(params: {
    accountBookId: string;
    actorEmployeeId: string;
    employeeId: string;
    /** Info: (20260818 - Julian) "YYYY-MM" */
    month: string;
  }): Promise<IOvertimeSummaryView> {
    await assertMayViewOvertimeOf({
      accountBookId: params.accountBookId,
      actorEmployeeId: params.actorEmployeeId,
      targetEmployeeId: params.employeeId,
    });

    const employee = await this.mustFindEmployee(params);

    const monthStart = `${params.month}-01`;
    const monthEnd = addIsoDays(addIsoMonths(monthStart, 1), -1);
    // Info: (20260818 - Julian) 滾動三個月，右端對齊該月月底（同核准時的窗定義）
    const quarterFrom = addIsoDays(
      addIsoMonths(monthEnd, -OVERTIME_QUARTERLY_WINDOW_MONTHS),
      1,
    );

    const [monthly, quarterly, policy] = await Promise.all([
      this.context.findApprovedInRange({
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        from: monthStart,
        to: monthEnd,
      }),
      this.context.findApprovedInRange({
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        from: quarterFrom,
        to: monthEnd,
      }),
      this.context.findPolicy(params.accountBookId),
    ]);

    const extendedLimitAgreed = policy?.extendedLimitAgreed ?? false;
    const limits = overtimeLimitsOf(extendedLimitAgreed);

    const byTier = new Map<OvertimePremiumTier, number>();
    for (const request of monthly) {
      for (const segment of request.segments) {
        byTier.set(
          segment.tier,
          (byTier.get(segment.tier) ?? 0) + segment.minutes,
        );
      }
    }

    const sumBy = (basis: OvertimeEvidenceBasis): number =>
      monthly
        .filter((request) => request.evidenceBasis === basis)
        .reduce((total, request) => total + request.recognizedMinutes, 0);

    const tierTotals: IOvertimeTierTotal[] = [...byTier.entries()].map(
      ([tier, minutes]) => ({ tier, minutes }),
    );

    return {
      ...employee,
      month: params.month,
      monthlyMinutes: monthly.reduce(
        (total, request) => total + request.recognizedMinutes,
        0,
      ),
      monthlyLimitMinutes: limits.monthlyMinutes,
      quarterFrom,
      quarterTo: monthEnd,
      quarterlyMinutes: quarterly.reduce(
        (total, request) => total + request.recognizedMinutes,
        0,
      ),
      quarterlyLimitMinutes: limits.quarterlyMinutes,
      extendedLimitAgreed,
      punchBackedMinutes: sumBy(OvertimeEvidenceBasis.PUNCH_RECORD),
      declaredMinutes: sumBy(OvertimeEvidenceBasis.MANUAL_DECLARATION),
      byTier: tierTotals,
    };
  }

  /**
   * Info: (20260818 - Julian) L29：有打卡但無核准加班單的時段。
   *
   * ## 它算的是什麼
   *
   * `在場區間 − 班別窗 − 已核准的加班區間`。剩下的分鐘是**事實**：
   * 那個人在現場，而沒有任何一張單涵蓋它。
   *
   * ## 它不下任何結論
   *
   * 剩下的時段可能是加班漏了申請，也可能只是下班後在休息室多待半小時。
   * 系統的責任是讓它浮出來，由主管決定要補核准、要說明、還是要制止 ——
   * 未核准的加班是勞資爭議最常見的起點，而事實仍存在於 `AttendancePunch` 裡，
   * 只是沒有人看見（ADR 024 §2.1）。
   *
   * ## 為什麼不落地
   *
   * 它是衍生提示（ADR 024 §9.5）。補了核准之後它就會消失，而那正是目的 ——
   * 一份會留下歷史的清單，還要再回答「這一筆後來處理了沒有」。
   *
   * ToDo: (20260818 - Julian) 「窗外工時」的推導在出勤模組列為待辦乙-1
   * （`evaluateAttendanceDay` 會 `clampToWindow`）。這裡的減法只服務**提示**，
   * 不參與任何認列 —— 兩者不可互相引用，否則提示會反過來變成事實來源。
   */
  public async listUnapproved(params: {
    accountBookId: string;
    actorEmployeeId: string;
    employeeId: string;
    from: string;
    to: string;
  }): Promise<IOvertimeExceptionReport> {
    await assertMayViewOvertimeOf({
      accountBookId: params.accountBookId,
      actorEmployeeId: params.actorEmployeeId,
      targetEmployeeId: params.employeeId,
    });

    if (isoDaySpan(params.from, params.to) > DEMO_ATTENDANCE_MAX_RANGE_DAYS) {
      throw new AppError(API_ERRORS.VA_ATTENDANCE_RANGE_TOO_LARGE);
    }

    const employee = await this.mustFindEmployee(params);
    const scope = {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      from: params.from,
      to: params.to,
    };

    const [approved, punchesByDate, windowsByDate] = await Promise.all([
      this.context.findApprovedInRange(scope),
      this.context.findPunchIntervalsByDate(scope),
      this.context.findShiftWindowsByDate(scope),
    ]);

    const approvedByDate = new Map<string, typeof approved>();
    for (const request of approved) {
      approvedByDate.set(request.workDate, [
        ...(approvedByDate.get(request.workDate) ?? []),
        request,
      ]);
    }

    const exceptions: IOvertimeExceptionView[] = [];

    for (const workDate of enumerateIsoDates(params.from, params.to)) {
      const dayApproved = approvedByDate.get(workDate) ?? [];
      const presence = punchesByDate[workDate] ?? [];

      if (presence.length > 0) {
        const window = windowsByDate[workDate];
        const covered: IMinuteInterval[] = [
          ...dayApproved.map((request) => ({
            startMinute: request.requestedStartMinute,
            endMinute: request.requestedEndMinute,
          })),
        ];
        /**
         * Info: (20260818 - Julian) 有班別才扣掉班別窗。非上班日沒有窗，
         * 因此那一天的在場時間**整段**都是未涵蓋的 —— 那正是要看到的東西。
         */
        if (
          window !== undefined &&
          window.windowStartMinute !== null &&
          window.windowEndMinute !== null
        ) {
          covered.push({
            startMinute: window.windowStartMinute,
            endMinute: window.windowEndMinute,
          });
        }

        const remaining = subtractIntervals(presence, covered);
        const minutes = totalIntervalMinutes(remaining);
        if (minutes > 0) {
          exceptions.push({
            workDate,
            type: OvertimeExceptionType.UNAPPROVED_OVERTIME,
            minutes,
            intervals: remaining,
            overtimeRequestId: null,
          });
        }
      }

      /**
       * Info: (20260818 - Julian) 自陳的加班單單獨列出（`MISSING_PUNCH_EVIDENCE`）。
       * 它不是異常，是一個**沒有出勤紀錄佐證**的認列 —— 該被看到，
       * 但下一步與上面那一種完全不同：這裡要的是補件或說明，不是補核准。
       */
      for (const request of dayApproved) {
        if (
          request.evidenceBasis !== OvertimeEvidenceBasis.MANUAL_DECLARATION
        ) {
          continue;
        }
        exceptions.push({
          workDate,
          type: OvertimeExceptionType.MISSING_PUNCH_EVIDENCE,
          minutes: request.recognizedMinutes,
          intervals: [],
          overtimeRequestId: request.id,
        });
      }
    }

    return { ...employee, from: params.from, to: params.to, exceptions };
  }

  private async mustFindEmployee(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<IOvertimeEmployeeRef> {
    const employee = await this.context.findEmployeeRef(params);
    if (employee === null) {
      throw new AppError(API_ERRORS.NF_EMPLOYEE_FOR_USER);
    }
    return employee;
  }
}

export const overtimeReportService = new OvertimeReportService(
  overtimeRequestContextRepo,
);
