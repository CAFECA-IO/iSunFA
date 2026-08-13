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
  findShiftDaysInRange(params: {
    accountBookId: string;
    employeeIds: string[];
    from: string;
    to: string;
  }): Promise<IShiftDayWithPattern[]>;
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

  /**
   * Info: (20260813 - Julian) 判定矩陣用：一次取整段期間、整批員工。
   *
   * ## 為什麼 `workDate` 是字串卻能用範圍比較
   *
   * 它存的是 "YYYY-MM-DD"，而這個格式的**字典序即日期序** ——
   * 那正是當初選它而不選 `DateTime` 的理由之一（`DateTime` 會把一個
   * 純日曆概念變成帶時區的瞬間，"這一天" 就得看伺服器在哪個時區）。
   *
   * ## 為什麼一定要帶 employeeIds
   *
   * 呼叫端只要一個人的資料時，不帶條件等於把整本帳本的排班撈回來再丟掉 ——
   * demo 規模看不出差別，正式環境的差別是一次查詢與一次全表掃描。
   * 空陣列直接回空，不讓它退化成「不篩選」。
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
}

export const attendanceScheduleRepo = new AttendanceScheduleRepository();
