import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { PRISMA_ERROR, rethrowAsAppError } from "@/lib/utils/prisma_error";
import { DEMO_TIME_ZONE } from "@/constants/attendance";
import {
  LeaveRecallDecision,
  LeaveRecallResolutionOutcome,
  LeaveRecallStatus,
} from "@/constants/leave";
import { toZonedParts } from "@/lib/utils/attendance_time";
import {
  ILeaveDayRecord,
  ILeaveRecallRecord,
  ILeaveRecallResolveParams,
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
 * Info: (20260813 - Julian) 請假可見度與銷假徵詢（A11–A14）。勞基法 §38 III：
 * 特休期日由勞工排定，銷假因此是三段式：主管發起徵詢 → 員工同意或婉拒 → 同意才改排班。
 *
 * 徵詢期間假仍然生效，不得在發起當下就改排班，否則員工還沒回應就被算進未到工。
 * 判定引擎只讀 `EmployeeShiftDay`，不知道假單存在——假單核准時投影成 `LEAVE`，
 * 銷假成立時投影回 `WORK` + 班別。
 */
export class LeaveService {
  constructor(
    private readonly leaves: ILeaveRepository,
    private readonly employees: IEmployeeRepository,
    private readonly patterns: IShiftPatternRepository,
    private readonly timeZone: string = DEMO_TIME_ZONE,
  ) {}

  /**
   * Info: (20260813 - Julian) A11：今日請假名單，對所有人開放——銷假前提是先看得到誰在放假。
   * 只回假別與事由，不帶診斷或證明；假別本身已是個資，正式版應依 ADR 018 分級後決定誰看得到。
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

  // Info: (20260813 - Julian) A12：發起銷假徵詢
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

    // Info: (20260813 - Julian) 只能對今天（含）以後——改寫已過去的假日會把歷史 OFF_DAY 變成曠職；「今天」用當地日曆日，不是 UTC
    const today = toZonedParts(observedAt, this.timeZone).isoDate;
    if (leaveDay.workDate < today) {
      throw new AppError(API_ERRORS.VA_LEAVE_RECALL_PAST);
    }

    // Info: (20260813 - Julian) 這裡的檢查只為了回一個看得懂的 409，真正的併發保證在 `LeaveRecall.pendingLeaveDayId` 的唯一鍵上
    if (leaveDay.recalls.length > 0) {
      throw new AppError(API_ERRORS.CF_LEAVE_RECALL_PENDING);
    }

    const pattern = await this.patterns.findByIdInAccountBook(
      accountBookId,
      shiftPatternId,
    );
    if (!pattern) throw new AppError(API_ERRORS.NF_SHIFT_PATTERN);

    /**
     * Info: (20260814 - Julian) 上面那次預先查詢只負責產生看得懂的 409；
     * **唯一保證在 `pendingLeaveDayId` 的唯一鍵上**。查與寫之間隔著三次 await，
     * 兩位主管同時對同一天發起時，第二個會在這裡撞 P2002。
     */
    let created;
    try {
      created = await this.leaves.createRecall({
        leaveDayId,
        shiftPatternId,
        requestedByEmployeeId: actorEmployeeId,
        reason,
      });
    } catch (error) {
      rethrowAsAppError(error, {
        [PRISMA_ERROR.UNIQUE_CONSTRAINT]: API_ERRORS.CF_LEAVE_RECALL_PENDING,
        // Info: (20260814 - Julian) 查到之後那筆請假日被撤銷了，對呼叫端而言就是不存在
        [PRISMA_ERROR.FOREIGN_KEY]: API_ERRORS.NF_LEAVE_DAY,
      });
    }

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

  // Info: (20260813 - Julian) A14：回應徵詢。只有被徵詢的本人能回應
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

    // Info: (20260813 - Julian) 同意與婉拒都是終局，不可覆寫——允許改答案會讓已經動過的排班與答案永久不一致
    // Info: (20260814 - Julian) 這裡只是快路徑；真正的把關在 repo 的附條件更新，不可只留這一道
    if (String(recall.status) !== LeaveRecallStatus.PENDING) {
      throw new AppError(API_ERRORS.CF_LEAVE_RECALL_ANSWERED);
    }

    // Info: (20260814 - Julian) 兩支各自完整，不是「共用參數 + 選擇性 projection」——repo 的型別不接受後者
    const resolveParams: ILeaveRecallResolveParams =
      decision === LeaveRecallDecision.ACCEPT
        ? {
            recallId,
            note,
            respondedAt,
            decision,
            projection: {
              leaveDayId: recall.leaveDayId,
              accountBookId,
              employeeId,
              workDate: recall.leaveDay.workDate,
              shiftPatternId: recall.shiftPatternId,
            },
          }
        : { recallId, note, respondedAt, decision };

    let resolution;
    try {
      resolution = await this.leaves.resolveRecall(resolveParams);
    } catch (error) {
      // Info: (20260814 - Julian) 徵詢被搶走已由 repo 用回傳值表達，這裡剩下的 P2002 只可能來自排班那張表
      rethrowAsAppError(error, {
        [PRISMA_ERROR.UNIQUE_CONSTRAINT]: API_ERRORS.CF_SCHEDULE_DAY_CONFLICT,
        [PRISMA_ERROR.RECORD_NOT_FOUND]: API_ERRORS.NF_LEAVE_RECALL,
      });
    }

    if (resolution.outcome === LeaveRecallResolutionOutcome.ALREADY_ANSWERED) {
      throw new AppError(API_ERRORS.CF_LEAVE_RECALL_ANSWERED);
    }

    logger.info(
      `[attendance] leave recall ${decision} by ${employeeNo}: ${recall.leaveDay.workDate}`,
    );

    return toRecallView(resolution.recall);
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
  // Info: (20260817 - Julian) 不回傳假別與事由：對全體開放的端點只需回答「他不在」（計畫書 §9.2）
  onLeave: true,
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
  leavePolicyCode: recall.leaveDay.leaveRequest.leavePolicy.code,
  leavePolicyName: recall.leaveDay.leaveRequest.leavePolicy.name,
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
