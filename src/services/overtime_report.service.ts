import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  DEMO_ATTENDANCE_MAX_RANGE_DAYS,
  DEMO_TIME_ZONE,
} from "@/constants/attendance";
import {
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
import {
  quarterlyWindowOf,
  subtractIntervals,
  totalIntervalMinutes,
} from "@/lib/overtime_rules";
import {
  addIsoDays,
  addIsoMonths,
  enumerateIsoDates,
  isoDaySpan,
  toZonedParts,
} from "@/lib/utils/attendance_time";
import {
  IOvertimeRequestContext,
  overtimeRequestContextRepo,
} from "@/repositories/overtime_request_context.repo";
import { employeeRepo } from "@/repositories/employee.repo";
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
    /**
     * Info: (20260820 - Julian) 由 route 傳入，不在 service 裡讀時鐘
     * —— 一個會自己看現在幾點的函式在測試裡重現不了（同本模組其餘處置）。
     */
    observedAt: Date;
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
    /**
     * Info: (20260820 - Julian) 與核准閘門**同一支**函式、且錨點夾到今天
     * （review 第 5 輪 M5）。
     *
     * ## 原本錯在哪
     *
     * 這裡自己抄了一份窗界算式並以**月底**為右端，註解卻寫「同核准時的窗定義」。
     * 對 `2026-08` 而言報表窗是 `06-01~08-31`，而 `2026-08-10` 那天的閘門窗是
     * `05-11~08-10` —— 報表的左端晚了 21 天，於是 5/11–5/31 的加班在報表上
     * 不見了。方向對使用者不利：主管看到「還有 8 小時」，按下核准卻被擋下。
     *
     * ## 為什麼夾到今天
     *
     * 當月的月底還沒發生。以它為錨會把窗整個往後推，而**往後推等於把左端
     * 往後推**，剛好丟掉最舊的那幾天 —— 那幾天是閘門仍然會算進去的。
     * 夾到今天之後，當月的報表窗與「今天送出一張單」的閘門窗逐日相同；
     * 過去的月份仍以月底為錨，那是那個月結束當下閘門看到的窗。
     */
    const today = toZonedParts(params.observedAt, DEMO_TIME_ZONE).isoDate;
    const anchor = monthEnd < today ? monthEnd : today;
    const quarter = quarterlyWindowOf(anchor);

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
        from: quarter.from,
        to: quarter.to,
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
      quarterFrom: quarter.from,
      quarterTo: quarter.to,
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
  /**
   * Info: (20260820 - Julian) L29 的**團隊版**（review 第 6 輪 M23）。
   *
   * ## 被修掉的空缺
   *
   * 簽核頁呼叫 L29 時沒有帶 `employeeId`，而 route 的預設是「本人」——
   * 於是主管在簽核頁上看到的是**他自己**的未核准時段，
   * 下屬的時段不會出現在任何一個畫面上。那支元件的檔頭自己寫著：
   * 「只做前者，主管會以為沒出現在清單上的就沒有發生」。
   *
   * ## 為什麼不是讓前端逐一呼叫
   *
   * 前端手上沒有「我管得到誰」那份清單，而讓它自己拼會變成第二份授權判斷。
   * 範圍在這裡解一次，與 `listPending` 同源 —— 看得到的與簽得動的是同一群人。
   *
   * 每個人各自過一次 `assertMayViewOvertimeOf`（`listUnapproved` 內），
   * 因此這一支沒有放寬任何可見範圍：它只是替主管把那幾次呼叫合起來。
   */
  public async listUnapprovedForTeam(params: {
    accountBookId: string;
    actorEmployeeId: string;
    from: string;
    to: string;
  }): Promise<IOvertimeExceptionReport[]> {
    const employeeIds = await employeeRepo.listManagedEmployeeIds({
      accountBookId: params.accountBookId,
      managerEmployeeId: params.actorEmployeeId,
    });

    /**
     * Info: (20260820 - Julian) 依序而非 `Promise.all`：一次可能是數十個人 ×
     * 每人數十天的打卡，平行打過去會在一個查詢裡把連線池吃光。
     * 這份清單是給眼睛掃的，慢一點沒關係，把資料庫拖垮有關係。
     */
    const reports: IOvertimeExceptionReport[] = [];
    for (const employeeId of employeeIds) {
      reports.push(
        await this.listUnapproved({
          accountBookId: params.accountBookId,
          actorEmployeeId: params.actorEmployeeId,
          employeeId,
          from: params.from,
          to: params.to,
        }),
      );
    }

    /**
     * Info: (20260820 - Julian) 沒有例外的人不回。
     *
     * 這份清單的用途是「誰有未核准的時段」，把每個人都列出來（多數是空的）
     * 會讓真正有事的那兩三個人淹在裡面 —— 而那正是這個提示要對抗的東西。
     */
    return reports.filter((report) => report.exceptions.length > 0);
  }

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
