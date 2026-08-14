import { EmployeeShiftDay, ShiftPattern } from "@/generated";
import { prisma } from "@/lib/prisma";
import { WorkDayType } from "@/constants/attendance";
import { assertSchedulableDay } from "@/repositories/attendance_schedule_invariant";

/**
 * Info: (20260813 - Julian) 排班資料存取層（唯一碰 Prisma），不含業務判斷。
 *
 * W3 只需要讀——打卡要知道當日班別才能決定這一筆屬於哪個工作日（跨夜班）。
 * 寫入路徑（建立班別、逐日指派、月曆調班）與 `assertSchedulableDay` 的呼叫屬於 W5。
 */
export type IShiftDayWithPattern = EmployeeShiftDay & {
  shiftPattern: ShiftPattern | null;
};

export interface IAttendanceScheduleRepository {
  findShiftDays(
    accountBookId: string,
    employeeId: string,
    workDates: string[],
  ): Promise<IShiftDayWithPattern[]>;
  findShiftDaysInRange(params: {
    accountBookId: string;
    employeeIds: string[];
    from: string;
    to: string;
  }): Promise<IShiftDayWithPattern[]>;
  upsertShiftDay(input: IShiftDayInput): Promise<IShiftDayWithPattern>;
}

export interface IShiftDayInput {
  accountBookId: string;
  employeeId: string;
  workDate: string;
  dayType: WorkDayType;
  /** Info: (20260813 - Julian) 非上班日必須是 null，不是省略——改成休假時要把舊班別清掉 */
  shiftPatternId: string | null;
}

class AttendanceScheduleRepository implements IAttendanceScheduleRepository {
  // Info: (20260813 - Julian) 一次取多天，因為跨夜班的歸屬判定需要「今天與昨天」兩筆，順序由這裡決定而非留給呼叫端組
  public async findShiftDays(
    accountBookId: string,
    employeeId: string,
    workDates: string[],
  ): Promise<IShiftDayWithPattern[]> {
    if (workDates.length === 0) return [];

    return prisma.employeeShiftDay.findMany({
      where: { accountBookId, employeeId, workDate: { in: workDates } },
      include: { shiftPattern: true },
    });
  }

  /**
   * Info: (20260813 - Julian) 判定矩陣用：一次取整段期間、整批員工。
   * `workDate` 存 "YYYY-MM-DD"，字典序即日期序，可直接 gte/lte，不需 `DateTime`。
   * 必須帶 `employeeIds`：空陣列直接回空，不讓查詢退化成全表掃描。
   */
  public async findShiftDaysInRange(params: {
    accountBookId: string;
    employeeIds: string[];
    from: string;
    to: string;
  }): Promise<IShiftDayWithPattern[]> {
    const { accountBookId, employeeIds, from, to } = params;
    if (employeeIds.length === 0) return [];

    return prisma.employeeShiftDay.findMany({
      where: {
        accountBookId,
        employeeId: { in: employeeIds },
        workDate: { gte: from, lte: to },
      },
      include: { shiftPattern: true },
    });
  }

  /**
   * Info: (20260813 - Julian) 逐日指派，upsert 而非 create——`@@unique([accountBookId, employeeId, workDate])`
   * 不容許第二筆，先查再決定 create/update 會讓兩個分頁同時改同一天時後者炸在唯一鍵上。
   *
   * 寫入前呼叫 `assertSchedulableDay`：service 端 zod 已擋掉非法組合，這裡再擋一次
   * 是因為 repository 是唯一 DB 閘口，種子腳本、資料遷移、未來的 Excel 匯入都會經過這裡。
   */
  public async upsertShiftDay(
    input: IShiftDayInput,
  ): Promise<IShiftDayWithPattern> {
    assertSchedulableDay({
      dayType: input.dayType,
      shiftPatternId: input.shiftPatternId,
    });

    const { accountBookId, employeeId, workDate, dayType, shiftPatternId } =
      input;

    return prisma.employeeShiftDay.upsert({
      where: {
        accountBookId_employeeId_workDate: {
          accountBookId,
          employeeId,
          workDate,
        },
      },
      create: { accountBookId, employeeId, workDate, dayType, shiftPatternId },
      update: { dayType, shiftPatternId },
      include: { shiftPattern: true },
    });
  }
}

export const attendanceScheduleRepo = new AttendanceScheduleRepository();
