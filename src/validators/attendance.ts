import { z } from "zod";
import { PunchType, WorkDayType } from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 簽到系統的 API 驗證。
 * Zod schema 集中於此，`route.ts` 只呼叫 `safeParse`（CLAUDE.md §2）。
 */

/**
 * Info: (20260813 - Julian) 打卡請求。**沒有時間欄位，而且不能有。** `punchedAt` 由伺服器產生（護欄 G1），
 * 若日後要支援補打卡，應走補登申請單（有簽核軌跡），不是放寬這支 schema。
 *
 * `accuracyMeters` 選填：缺值視為未知，由 service 依政策決定要不要放行（demo 放行，護欄 G3）。
 */
export const attendancePunchSchema = z.object({
  punchType: z.nativeEnum(PunchType),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().max(100_000).optional(),
});

export type IAttendancePunchInput = z.infer<typeof attendancePunchSchema>;

// Info: (20260813 - Julian) "YYYY-MM-DD"，且必須是真實存在的日曆日（擋掉 2026-02-31）
// Info: (20260813 - Julian) 匯出供假勤共用：日期字串的定義只該有一份
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "not a real calendar date");

/**
 * Info: (20260813 - Julian) 判定結果查詢（A9）。
 * `from > to` 在這裡擋掉，不讓 service 回空矩陣——空矩陣是對資料的陳述，參數寫反是對請求的陳述，混在一起會誤導除錯方向。
 * **區間上限不在這裡擋**：它需要專屬錯誤碼與日期運算，屬於 service 的判斷。
 */
export const attendanceResultQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    employeeId: z.string().min(1).optional(),
  })
  .refine((value) => value.from <= value.to, {
    message: "from must not be later than to",
    path: ["from"],
  });

export type IAttendanceResultQuery = z.infer<
  typeof attendanceResultQuerySchema
>;

/**
 * Info: (20260813 - Julian) 緊急點名匯出（A10）。`workLocationId` 選填，不給就匯出全帳本每個地點——
 * 預設全部而非必填：火災時要的是「樓裡還有誰」，不是先選對地點。
 */
export const attendanceRosterExportSchema = z.object({
  workLocationId: z.string().min(1).optional(),
});

export type IAttendanceRosterExportInput = z.infer<
  typeof attendanceRosterExportSchema
>;

// Info: (20260813 - Julian) 排班月曆查詢（A7）。區間規則同判定矩陣
export const attendanceScheduleQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    departmentId: z.string().min(1).optional(),
  })
  .refine((value) => value.from <= value.to, {
    message: "from must not be later than to",
    path: ["from"],
  });

export type IAttendanceScheduleQuery = z.infer<
  typeof attendanceScheduleQuerySchema
>;

/**
 * Info: (20260813 - Julian) 改單日排班（A8）。**可辨識聯集，不是「選填的 shiftPatternId」。**
 * 寫成聯集讓「上班日沒帶班別」與「非上班日卻帶班別」連解析都做不到（同 ADR 019 判準）。
 *
 * 非上班日刻意要求 `shiftPatternId` 為 `null` 而非省略——`undefined` 在 Prisma `update` 裡代表
 * 「不要動這個欄位」，若省略，把上班日改成休假時舊班別不會被清掉。
 */
export const attendanceScheduleUpdateSchema = z.intersection(
  z.object({
    employeeId: z.string().min(1),
    workDate: isoDateSchema,
  }),
  z.discriminatedUnion("dayType", [
    z.object({
      dayType: z.literal(WorkDayType.WORK),
      shiftPatternId: z.string().min(1),
    }),
    z.object({
      dayType: z.enum([
        WorkDayType.REGULAR_OFF,
        WorkDayType.REST_DAY,
        WorkDayType.HOLIDAY,
        WorkDayType.LEAVE,
      ]),
      shiftPatternId: z.null(),
    }),
  ]),
);

export type IAttendanceScheduleUpdate = z.infer<
  typeof attendanceScheduleUpdateSchema
>;
