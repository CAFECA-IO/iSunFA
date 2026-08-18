import {
  DEMO_ATTENDANCE_MAX_RANGE_DAYS,
  WorkDayType,
} from "@/constants/attendance";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";
import { EmployeeHrFunction } from "@/constants/hr_management";
import {
  employeeHrFunctionRepo,
  IEmployeeHrFunctionRepository,
} from "@/repositories/employee_hr_function.repo";
import { PRISMA_ERROR, rethrowAsAppError } from "@/lib/utils/prisma_error";
import { deriveShiftPatternKind } from "@/lib/attendance_rules";
import { toShiftWindow } from "@/lib/attendance_schedule_view";
import { enumerateIsoDates, isoDaySpan } from "@/lib/utils/attendance_time";
import {
  IScheduleCalendar,
  IScheduleDayCell,
  IScheduleRow,
  IShiftPatternSummary,
} from "@/interfaces/attendance";
import {
  IAttendanceScheduleQuery,
  IAttendanceScheduleUpdate,
} from "@/validators/attendance";
import {
  employeeRepo,
  IEmployeeRepository,
} from "@/repositories/employee.repo";
import {
  attendanceScheduleRepo,
  IAttendanceScheduleRepository,
  IShiftDayWithPattern,
} from "@/repositories/attendance_schedule.repo";
import {
  IShiftPatternRepository,
  shiftPatternRepo,
} from "@/repositories/shift_pattern.repo";
import { AttendanceScheduleInvariantError } from "@/repositories/attendance_schedule_invariant";
import {
  auditLogRepo,
  IAuditLogRepository,
} from "@/repositories/audit_log.repo";

/**
 * Info: (20260813 - Julian) 班別與排班（A6 / A7 / A8）。排班是判定矩陣（A9）的輸入之一，
 * 兩者分開端點是因為排班必須能獨立於判定存在（下個月的班表現在就能排）。
 *
 * 非法狀態擋在三層：TypeScript 可辨識聯集、Zod（本層入口）、
 * `assertSchedulableDay`（repository，擋種子腳本／匯入等繞過 API 的路徑）。
 */

const toCell = (
  workDate: string,
  day: IShiftDayWithPattern | undefined,
): IScheduleDayCell => {
  const shift = day ? toShiftWindow(day) : null;
  return {
    workDate,
    // Info: (20260813 - Julian) Prisma 回字面量聯集，`WorkDayType` 是 TS enum；值域一致由 enum mirror 測試保證
    dayType: day ? (day.dayType as WorkDayType) : null,
    shiftPatternId: day?.shiftPatternId ?? null,
    shiftCode: day?.shiftPattern?.code ?? null,
    shiftName: day?.shiftPattern?.name ?? null,
    shiftKind: shift ? deriveShiftPatternKind(shift) : null,
  };
};

/**
 * Info: (20260817 - Luphia) 只取 `createAuditLog` 而不是整個 `IAuditLogRepository`：
 * 這支 service 只寫不讀稽核，而讓它拿到查詢方法會讓測試的假物件必須實作
 * 四個方法（含一個複雜的 Prisma payload 型別）才編得過 —— 那種成本會誘使下一個人
 * 改用 `as unknown as` 繞過去，而那就繞掉了型別檢查本身。
 */
type IAuditLogWriter = Pick<IAuditLogRepository, "createAuditLog">;

export class AttendanceScheduleService {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly schedule: IAttendanceScheduleRepository,
    private readonly patterns: IShiftPatternRepository,
    private readonly audits: IAuditLogWriter,
    private readonly hrFunctions: IEmployeeHrFunctionRepository,
  ) {}

  // Info: (20260813 - Julian) A6：班別清單。`kind`（固定／彈性）由六個欄位衍生，不是資料庫欄位——存判別欄位只會在有人改時間忘了同步改它時開始說謊
  public async listShiftPatterns(
    accountBookId: string,
  ): Promise<IShiftPatternSummary[]> {
    const patterns = await this.patterns.findByAccountBook(accountBookId);

    return patterns.map((pattern) => {
      const window = {
        windowStartMinute: pattern.windowStartMinute,
        windowEndMinute: pattern.windowEndMinute,
        coreStartMinute: pattern.coreStartMinute,
        coreEndMinute: pattern.coreEndMinute,
        requiredWorkMinutes: pattern.requiredWorkMinutes,
        breakMinutes: pattern.breakMinutes,
      };
      return {
        id: pattern.id,
        code: pattern.code,
        name: pattern.name,
        kind: deriveShiftPatternKind(window),
        window,
      };
    });
  }

  // Info: (20260813 - Julian) A7：排班月曆（部門 × 月）
  public async getCalendar(params: {
    accountBookId: string;
    query: IAttendanceScheduleQuery;
  }): Promise<IScheduleCalendar> {
    const { accountBookId } = params;
    const { from, to, departmentId } = params.query;

    // Info: (20260813 - Julian) 區間上限與判定矩陣（A9）共用同一常數，避免「總覽看得到、班表看不到」的不一致
    if (isoDaySpan(from, to) > DEMO_ATTENDANCE_MAX_RANGE_DAYS) {
      throw new AppError(API_ERRORS.VA_ATTENDANCE_RANGE_TOO_LARGE);
    }

    const workDates = enumerateIsoDates(from, to);
    const roster = await this.employees.findRosterInPeriod({
      accountBookId,
      from,
      to,
      departmentId,
    });

    if (roster.length === 0) return { from, to, workDates, rows: [] };

    const shiftDays = await this.schedule.findShiftDaysInRange({
      accountBookId,
      employeeIds: roster.map((employee) => employee.id),
      from,
      to,
    });

    const index = new Map<string, Map<string, IShiftDayWithPattern>>();
    for (const day of shiftDays) {
      const byDate = index.get(day.employeeId) ?? new Map();
      // Info: (20260813 - Julian) 一人一天最多一筆，由 @@unique 保證，因此直接覆寫
      byDate.set(day.workDate, day);
      index.set(day.employeeId, byDate);
    }

    const rows: IScheduleRow[] = roster.map((employee) => ({
      employeeId: employee.id,
      employeeNo: employee.employeeNo,
      name: employee.name,
      departmentId: employee.departmentId,
      departmentName: employee.department?.name ?? null,
      jobTitle: employee.jobTitle?.title ?? null,
      days: workDates.map((workDate) =>
        toCell(workDate, index.get(employee.id)?.get(workDate)),
      ),
    }));

    return { from, to, workDates, rows };
  }

  /**
   * Info: (20260813 - Julian) A8：改單日排班。
   *
   * Info: (20260817 - Luphia) 這個動作會**改寫歷史判定**：判定即時算不落地（A9 不讀結果表），
   * 把 8/12 從上班日改成休假，那天的曠職就當場消失。因此它必須留痕。
   *
   * 取母計畫 §10.1 已規劃的做法（`EMPLOYEE_PII` / `UPDATE`）而不是新增
   * `AuditLogDataType`：ADR 018 §6 把個資軌跡的調查軸線定為 `Employee.id`，
   * 而「誰的班表被誰改過」正是同一條軸線上的問題。另立型別只會讓
   * 「這名員工的資料被誰動過」需要查兩種 dataType。
   *
   * `dataId` 填**被改的那位員工**（不是操作者）—— 同 §10.1 對逐人動作的處置，
   * 也同 ADR 018 §6 的理由：調查問的是「哪些人受影響」。操作者記在 `userId`。
   *
   * ToDo: (20260817 - Luphia) 稽核寫在 upsert **之後**，兩者不在同一個交易裡：
   * 排班寫成功而稽核寫失敗時，會留下一筆沒有軌跡的變更（呼叫端會收到 500，
   * 但改動已經生效）。要讓它原子化，得走 `coding_guidelines.md` §1.1 的
   * unit-of-work（把兩張表的寫入放進 repository 的同一個交易）——
   * 那是正式版連同「排班 append-only 加生效版本」一起評估的事，
   * 因為真正要重建的是「任一時點的班表長什麼樣」，而不只是「誰改的」。
   */
  public async updateScheduleDay(params: {
    accountBookId: string;
    input: IAttendanceScheduleUpdate;
    actorEmployeeId: string;
    actorEmployeeNo: string;
    actorUserId: string;
  }): Promise<IScheduleDayCell> {
    const {
      accountBookId,
      input,
      actorEmployeeId,
      actorEmployeeNo,
      actorUserId,
    } = params;

    /**
     * Info: (20260817 - Luphia) 排班寫入限主管。**這不是計畫書 §7.3 第 1 順位的權限矩陣**，
     * 是在那份矩陣做出來之前把最大的洞收窄。
     *
     * 為什麼不能等：排班是判定的**比較基準**，而判定即時算不落地 ——
     * 改一格排班就是改一天的歷史判定，且全系統只留一行日誌。
     * 讀取端（月曆 GET、判定矩陣 A9）維持全帳本可見（那是 §7.3 第 1 順位要處理的），
     * 這裡只擋**寫入**：能看到別人的班表是隱私問題，能改別人的班表是稽核問題，
     * 而後者無法事後復原。
     *
     * Info: (20260818 - Julian) 甲-1 之後這道閘收斂成兩條路，順序有意義：
     *
     * 1. **具 `HR_ADMIN` / `TIMEKEEPER` 職能者**：跨部門通行。工地文書要排得了
     *    全工地的班，而他不是任何部門的 `managerId`；原本的粗判斷會把他擋在外面。
     * 2. **部門主管**：先問「你是不是主管」（不是就回 `SUPERVISOR_ONLY`，
     *    而且問得到答案之前不碰任何單據，見下面第三段），再問「這個人歸不歸你管」
     *    （不歸就回 `SCHEDULE_SCOPE`）。
     *
     * 原本只有 `isDepartmentManager` 一條，而它問的是「你有沒有管**任何**部門」——
     * 第一工務段的主管因此改得動第五工務段的班表。上游把它記為有意識的暫時取捨
     * （`attendance_demo_plan.md` §7.3 第 1 順位的修訂），這裡把它收掉。
     *
     * 兩個碼分開的理由同 `FO_LEAVE_RECALL_SCOPE`：「你不是主管」與
     * 「你是主管但範圍不對」的下一步完全不同。而兩者都排在租戶檢查之前 ——
     * 403 與 404 的先後本身就是一個探測管道。
     */
    const hasHrFunction = await this.hrFunctions.hasAnyFunction({
      accountBookId,
      employeeId: actorEmployeeId,
      hrFunctions: [EmployeeHrFunction.HR_ADMIN, EmployeeHrFunction.TIMEKEEPER],
    });

    if (!hasHrFunction) {
      const isManager = await this.employees.isDepartmentManager({
        accountBookId,
        employeeId: actorEmployeeId,
      });
      if (!isManager) {
        throw new AppError(API_ERRORS.FO_ATTENDANCE_SUPERVISOR_ONLY);
      }

      const managesTarget = await this.employees.managesEmployee({
        accountBookId,
        managerEmployeeId: actorEmployeeId,
        targetEmployeeId: input.employeeId,
      });
      if (!managesTarget) {
        throw new AppError(API_ERRORS.FO_ATTENDANCE_SCHEDULE_SCOPE);
      }
    }

    const employee = await this.employees.findByIdInAccountBook(
      accountBookId,
      input.employeeId,
    );
    if (!employee) throw new AppError(API_ERRORS.NF_EMPLOYEE);

    // Info: (20260813 - Julian) 班別也要綁帳本確認一次——DB 層沒有跨帳本約束，少這一步會讓別家帳本的班別 id 寫得進去
    if (input.shiftPatternId) {
      const pattern = await this.patterns.findByIdInAccountBook(
        accountBookId,
        input.shiftPatternId,
      );
      if (!pattern) throw new AppError(API_ERRORS.NF_SHIFT_PATTERN);
    }

    try {
      const saved = await this.schedule.upsertShiftDay({
        accountBookId,
        employeeId: input.employeeId,
        workDate: input.workDate,
        dayType: input.dayType,
        shiftPatternId: input.shiftPatternId,
      });

      await this.audits.createAuditLog({
        userId: actorUserId,
        accountBookId,
        dataType: AuditLogDataType.EMPLOYEE_PII,
        dataId: input.employeeId,
        action: AuditLogAction.UPDATE,
      });

      logger.info(
        `[attendance] schedule updated by ${actorEmployeeNo}: ${employee.employeeNo} ${input.workDate} -> ${input.dayType}${
          input.shiftPatternId ? ` (${input.shiftPatternId})` : ""
        }`,
      );

      return toCell(input.workDate, saved);
    } catch (error) {
      // Info: (20260813 - Julian) 不變式違反轉成 400，不讓它變成 500——repository 的守衛丟的是具名錯誤，不轉譯會讓呼叫端誤以為資料庫失敗
      if (error instanceof AttendanceScheduleInvariantError) {
        throw new AppError(API_ERRORS.VA_SCHEDULE_DAY_INVALID);
      }
      // Info: (20260814 - Julian) upsert 在併發下會撞 @@unique，那是衝突不是故障
      rethrowAsAppError(error, {
        [PRISMA_ERROR.UNIQUE_CONSTRAINT]: API_ERRORS.CF_SCHEDULE_DAY_CONFLICT,
      });
    }
  }
}

export const attendanceScheduleService = new AttendanceScheduleService(
  employeeRepo,
  attendanceScheduleRepo,
  shiftPatternRepo,
  auditLogRepo,
  employeeHrFunctionRepo,
);
