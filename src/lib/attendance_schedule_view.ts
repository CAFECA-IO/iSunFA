import { WorkDayType } from "@/constants/attendance";
import { IDaySchedule, IShiftWindow } from "@/interfaces/attendance";
import { IShiftDayWithPattern } from "@/repositories/attendance_schedule.repo";

/**
 * Info: (20260813 - Julian) 把排班列轉成判定引擎看得懂的形狀。純函數，不碰資料庫。
 *
 * ## 為什麼要有這一層
 *
 * 引擎收的是 `IDaySchedule`（可辨識聯集），資料庫給的是
 * 「`dayType` 加一個可為 null 的 `shiftPattern`」。中間這一步轉換
 * 原本各自寫在打卡 service 裡；判定 service 也要用，複製第二份的代價是
 * **`ShiftPattern` 日後多一個欄位時，只有其中一份會被改到** ——
 * 而兩份不一致的症狀是「打卡頁說今天是彈性班、出勤總覽用固定班判遲到」。
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
 * Info: (20260813 - Julian) 轉成引擎的 `IDaySchedule`。
 *
 * ## 三種輸入、三種不同的意思
 *
 * - `undefined`（當日沒有排班列）→ `null`：**系統沒有比較基準**，引擎回
 *   `NO_SCHEDULE` 而不是曠職。這與「排了休假」是兩件完全不同的事。
 * - `dayType = WORK` → 帶班別的上班日。
 * - 其餘 → 免除出勤義務的日子，型別上就不可能帶班別。
 *
 * ## `WORK` 卻沒有班別時取 `null` 而不是硬編一個空班別
 *
 * 那是 `assertSchedulableDay` 擋在寫入端的不變式，正常路徑到不了這裡。
 * 但若歷史資料或直連 DB 的操作留下了這種列，唯一誠實的處置是
 * 「當作沒有比較基準」—— 補一個猜出來的班別，等於拿一個沒人排過的
 * 上下班時間去判某個人遲到。
 */
export function toDaySchedule(
  day: IShiftDayWithPattern | undefined,
): IDaySchedule | null {
  if (!day) return null;

  const shift = toShiftWindow(day);

  /**
   * Info: (20260813 - Julian) Prisma 產生的是**字面量聯集**，`@/constants` 的是
   * TS string enum（名義型別），兩者不能直接比較 —— 先放寬成 `string`。
   * 值域一致由 `hr_enum_mirror.test.ts` 保證，那條測試在 schema 一改動就會紅。
   */
  const dayType: string = day.dayType;

  if (dayType === WorkDayType.WORK) {
    return shift ? { dayType: WorkDayType.WORK, shift } : null;
  }

  return { dayType: dayType as Exclude<WorkDayType, WorkDayType.WORK> };
}
