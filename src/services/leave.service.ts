import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { DEMO_TIME_ZONE } from "@/constants/attendance";
import {
  LeaveRecallDecision,
  LeaveRecallStatus,
  LeaveType,
} from "@/constants/leave";
import { toZonedParts } from "@/lib/utils/attendance_time";
import {
  ILeaveDayRecord,
  ILeaveRecallRecord,
  ILeaveRepository,
  leaveRepo,
} from "@/repositories/leave.repo";
import {
  employeeRepo,
  IEmployeeRepository,
} from "@/repositories/employee.repo";
import {
  shiftPatternRepo,
  IShiftPatternRepository,
} from "@/repositories/shift_pattern.repo";
import {
  ILeaveRecallView,
  ILeaveTodayEntry,
  ILeaveTodayView,
} from "@/interfaces/leave";

/**
 * Info: (20260813 - Julian) 請假可見度與銷假徵詢（A11–A14）。
 *
 * ## 這支 service 的存在理由是一條法律
 *
 * 勞基法 §38 III：特別休假期日**由勞工排定**，雇主僅得基於企業經營上之急迫需求
 * 「與勞工協商調整」。因此銷假在這裡不是一個動作，是三段：
 * 主管發起徵詢（附理由與班別）→ 員工同意或婉拒 → 同意才改排班。
 *
 * **徵詢期間假仍然生效。** 若在發起的當下就把該日改回上班日，員工還沒回應
 * 就已經處在「排了班卻沒到」的狀態，現場頁會把他算進未到工 ——
 * 那是拿系統事實去施壓，正好是那條法律想避免的事。
 *
 * ## 判定引擎完全不知道假單存在
 *
 * 引擎讀的是 `EmployeeShiftDay`。假單核准時投影成 `LEAVE`，銷假成立時投影回
 * `WORK` + 班別。多一個資料來源，就多一組「兩邊說法不一致」的可能（計畫書 §8.2）。
 */
export class LeaveService {
  constructor(
    private readonly leaves: ILeaveRepository,
    private readonly employees: IEmployeeRepository,
    private readonly patterns: IShiftPatternRepository,
    private readonly timeZone: string = DEMO_TIME_ZONE,
  ) {}

  /**
   * Info: (20260813 - Julian) A11：今日請假名單。
   *
   * ## 為什麼這份名單對所有人開放
   *
   * 「人手不足要能銷假」的前提是**先看得到誰在放假**（計畫書 §8.6）。
   * 而在此之前，請假的人在現場頁上完全不存在 —— 既不在班、也不算未到工，
   * 因為未到工的判定硬性 gate 在 `dayType === WORK`。
   *
   * 回傳只帶假別與事由，不帶任何診斷或證明。假別本身已經是個資
   * （「普通傷病假」透露健康狀況），正式版應依 ADR 018 分級後決定誰看得到 ——
   * 這裡刻意留成 demo 的已知取捨，而不是假裝它不存在。
   */
  public async listToday(params: {
    accountBookId: string;
    viewerEmployeeId: string;
    observedAt: Date;
    date?: string;
  }): Promise<ILeaveTodayView> {
    const { accountBookId, viewerEmployeeId, observedAt, date } = params;
    const workDate = date ?? toZonedParts(observedAt, this.timeZone).isoDate;

    const [days, canRequestRecall] = await Promise.all([
      this.leaves.findActiveLeaveDays({ accountBookId, workDate }),
      this.employees.isDepartmentManager({
        accountBookId,
        employeeId: viewerEmployeeId,
      }),
    ]);

    return {
      workDate,
      timeZone: this.timeZone,
      entries: days.map(toTodayEntry),
      canRequestRecall,
    };
  }

  /**
   * Info: (20260813 - Julian) A12：發起銷假徵詢。
   */
  public async requestRecall(params: {
    accountBookId: string;
    leaveDayId: string;
    shiftPatternId: string;
    reason: string;
    actorEmployeeId: string;
    actorEmployeeNo: string;
    observedAt: Date;
  }): Promise<ILeaveRecallView> {
    const {
      accountBookId,
      leaveDayId,
      shiftPatternId,
      reason,
      actorEmployeeId,
      actorEmployeeNo,
      observedAt,
    } = params;

    const isManager = await this.employees.isDepartmentManager({
      accountBookId,
      employeeId: actorEmployeeId,
    });
    if (!isManager) {
      throw new AppError(API_ERRORS.FO_ATTENDANCE_SUPERVISOR_ONLY);
    }

    const leaveDay = await this.leaves.findActiveLeaveDayById({
      accountBookId,
      leaveDayId,
    });
    if (!leaveDay) throw new AppError(API_ERRORS.NF_LEAVE_DAY);

    /**
     * Info: (20260813 - Julian) 只能往前，不能往後。
     *
     * 把已經過去的假日改回上班日，會讓那一天的判定從 OFF_DAY 變成曠職 ——
     * 一個人的歷史出勤紀錄，因為今天的一次操作而多出一筆異常。
     * 「今天」的界線用當地日曆日，不是 UTC：跨日的那一小時裡，
     * 台北的今天與 UTC 的今天是不同的兩天，而排班說的是前者。
     */
    const today = toZonedParts(observedAt, this.timeZone).isoDate;
    if (leaveDay.workDate < today) {
      throw new AppError(API_ERRORS.VA_LEAVE_RECALL_PAST);
    }

    /**
     * Info: (20260813 - Julian) 先查一次待回應的徵詢，只為了回一個看得懂的 409。
     *
     * 真正的保證在 `LeaveRecall.pendingLeaveDayId` 的唯一鍵上 ——
     * 查與寫之間的空窗正是兩個分頁同時按下去時會發生的事，
     * 而那時擋住它的是資料庫，不是這幾行。
     */
    if (leaveDay.recalls.length > 0) {
      throw new AppError(API_ERRORS.CF_LEAVE_RECALL_PENDING);
    }

    const pattern = await this.patterns.findByIdInAccountBook(
      accountBookId,
      shiftPatternId,
    );
    if (!pattern) throw new AppError(API_ERRORS.NF_SHIFT_PATTERN);

    const created = await this.leaves.createRecall({
      leaveDayId,
      shiftPatternId,
      requestedByEmployeeId: actorEmployeeId,
      reason,
    });

    logger.info(
      `[attendance] leave recall requested by ${actorEmployeeNo}: ${leaveDay.leaveRequest.employee.employeeNo} ${leaveDay.workDate}`,
    );

    return toRecallView(created);
  }

  /** Info: (20260813 - Julian) A13：我待回應的徵詢 */
  public async listPendingFor(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<ILeaveRecallView[]> {
    const recalls = await this.leaves.findPendingRecallsFor(params);
    return recalls.map(toRecallView);
  }

  /**
   * Info: (20260813 - Julian) A14：回應徵詢。**只有被徵詢的本人能回應。**
   */
  public async respondRecall(params: {
    accountBookId: string;
    recallId: string;
    employeeId: string;
    employeeNo: string;
    decision: LeaveRecallDecision;
    note?: string;
    respondedAt: Date;
  }): Promise<ILeaveRecallView> {
    const {
      accountBookId,
      recallId,
      employeeId,
      employeeNo,
      decision,
      note,
      respondedAt,
    } = params;

    const recall = await this.leaves.findRecallById({
      accountBookId,
      recallId,
    });
    if (!recall) throw new AppError(API_ERRORS.NF_LEAVE_RECALL);

    if (recall.leaveDay.leaveRequest.employeeId !== employeeId) {
      throw new AppError(API_ERRORS.FO_LEAVE_RECALL_NOT_OWNER);
    }

    /**
     * Info: (20260813 - Julian) 同意與婉拒都是終局，不可覆寫。
     *
     * 允許改答案，等於允許「先同意讓班表改掉，事後再改成婉拒」——
     * 而那時排班已經動過了，兩邊會永久不一致。
     */
    if (String(recall.status) !== LeaveRecallStatus.PENDING) {
      throw new AppError(API_ERRORS.CF_LEAVE_RECALL_ANSWERED);
    }

    const resolved = await this.leaves.resolveRecall({
      recallId,
      decision,
      note,
      respondedAt,
      projection:
        decision === LeaveRecallDecision.ACCEPT
          ? {
              leaveDayId: recall.leaveDayId,
              accountBookId,
              employeeId,
              workDate: recall.leaveDay.workDate,
              shiftPatternId: recall.shiftPatternId,
            }
          : undefined,
    });

    logger.info(
      `[attendance] leave recall ${decision} by ${employeeNo}: ${recall.leaveDay.workDate}`,
    );

    return toRecallView(resolved);
  }
}

// Info: (20260813 - Julian) 三層巢狀的實體攤平成一列。Prisma enum 是字面量聯集，故顯式轉回鏡像 enum
const toTodayEntry = (day: ILeaveDayRecord): ILeaveTodayEntry => ({
  leaveDayId: day.id,
  workDate: day.workDate,
  employeeId: day.leaveRequest.employee.id,
  employeeNo: day.leaveRequest.employee.employeeNo,
  name: day.leaveRequest.employee.name,
  departmentName: day.leaveRequest.employee.department?.name ?? null,
  jobTitle: day.leaveRequest.employee.jobTitle?.title ?? null,
  leaveType: day.leaveRequest.leaveType as LeaveType,
  reason: day.leaveRequest.reason,
  hasPendingRecall: day.recalls.length > 0,
});

const toRecallView = (recall: ILeaveRecallRecord): ILeaveRecallView => ({
  recallId: recall.id,
  leaveDayId: recall.leaveDayId,
  workDate: recall.leaveDay.workDate,
  status: recall.status as LeaveRecallStatus,
  reason: recall.reason,
  responseNote: recall.responseNote,
  respondedAt: recall.respondedAt ? recall.respondedAt.toISOString() : null,
  createdAt: recall.createdAt.toISOString(),
  employeeId: recall.leaveDay.leaveRequest.employee.id,
  employeeNo: recall.leaveDay.leaveRequest.employee.employeeNo,
  employeeName: recall.leaveDay.leaveRequest.employee.name,
  leaveType: recall.leaveDay.leaveRequest.leaveType as LeaveType,
  requestedByEmployeeNo: recall.requestedBy.employeeNo,
  requestedByName: recall.requestedBy.name,
  shiftPatternId: recall.shiftPatternId,
  shiftName: recall.shiftPattern.name,
});

export const leaveService = new LeaveService(
  leaveRepo,
  employeeRepo,
  shiftPatternRepo,
);
