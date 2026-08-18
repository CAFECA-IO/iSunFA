import { WorkDayType } from "@/constants/attendance";
import { IDaySchedule, IShiftWindow } from "@/interfaces/attendance";
import { IShiftDayWithPattern } from "@/repositories/attendance_schedule.repo";

/**
 * Info: (20260813 - Julian) 把排班列轉成判定引擎看得懂的形狀。純函數，不碰資料庫。
 * 引擎收的是 `IDaySchedule`（可辨識聯集），資料庫給的是「dayType + 可為 null 的 shiftPattern」，
 * 這一層轉換集中在此，避免打卡與判定兩處各寫一份、日後其中一份漏改。
 */
export function toShiftWindow(day: IShiftDayWithPattern): IShiftWindow | null {
  if (!day.shiftPattern) return null;
  const pattern = day.shiftPattern;
  return {
    windowStartMinute: pattern.windowStartMinute,
    windowEndMinute: pattern.windowEndMinute,
    coreStartMinute: pattern.coreStartMinute,
    coreEndMinute: pattern.coreEndMinute,
    requiredWorkMinutes: pattern.requiredWorkMinutes,
    breakMinutes: pattern.breakMinutes,
  };
}

/**
 * Info: (20260813 - Julian) 轉成引擎的 `IDaySchedule`。三種輸入三種意思：
 * `undefined`（當日沒有排班列）→ `null`，引擎回 `NO_SCHEDULE` 而非曠職；
 * `dayType = WORK` → 帶班別的上班日；其餘為免除出勤義務的日子。
 *
 * `WORK` 卻沒有班別時取 `null` 而不硬編一個空班別：正常路徑到不了這裡
 * （見 `assertSchedulableDay`），若歷史資料留下這種列，唯一誠實的處置是當作沒有比較基準。
 */
export function toDaySchedule(
  day: IShiftDayWithPattern | undefined,
): IDaySchedule | null {
  if (!day) return null;

  const shift = toShiftWindow(day);

  /**
   * Info: (20260813 - Julian) Prisma 產生的是字面量聯集，`@/constants` 的是 TS string enum，
   * 兩者不能直接比較，先放寬成 `string`；值域一致由 `hr_enum_mirror.test.ts` 保證。
   */
  const dayType: string = day.dayType;

  if (dayType === WorkDayType.WORK) {
    return shift ? { dayType: WorkDayType.WORK, shift } : null;
  }

  return { dayType: dayType as Exclude<WorkDayType, WorkDayType.WORK> };
}
