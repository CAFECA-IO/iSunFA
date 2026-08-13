import { EmployeeShiftDay, ShiftPattern } from "@/generated";
import { prisma } from "@/lib/prisma";

/**
 * Info: (20260813 - Julian) 排班資料存取層（唯一碰 Prisma）；不含任何業務判斷。
 *
 * W3 只需要讀 —— 打卡要知道當日班別才能決定這一筆屬於哪個工作日（跨夜班）。
 * 寫入路徑（建立班別、逐日指派、月曆調班）與 `assertSchedulableDay` 的呼叫
 * 屬於 W5，屆時補在同一支 repository 內。
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
}

class AttendanceScheduleRepository implements IAttendanceScheduleRepository {
  /**
   * Info: (20260813 - Julian) 一次取多天，因為跨夜班的歸屬判定需要「今天與昨天」兩筆。
   *
   * 分兩次查會讓呼叫端自己組順序，而順序決定了跨日班算哪一天 ——
   * 那是業務規則，不該散落在查詢的呼叫點。
   */
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
}

export const attendanceScheduleRepo = new AttendanceScheduleRepository();
