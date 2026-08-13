import { z } from "zod";
import { PunchType, WorkDayType } from "@/constants/attendance";

/**
 * Info: (20260813 - Julian) 簽到系統的 API 驗證。
 * Zod schema 集中於此，`route.ts` 只呼叫 `safeParse`（CLAUDE.md §2）。
 */

/**
 * Info: (20260813 - Julian) 打卡請求。
 *
 * **沒有時間欄位，而且不能有。** `punchedAt` 由伺服器產生（護欄 G1）——
 * 竄改打卡時間是本系統價值最高的攻擊，只要 client 傳得進來就永遠擋不住。
 * 若日後有人為了「補打卡」想在這裡加一個時間欄位，那條路徑應該走補登申請單
 * （有簽核軌跡），不是放寬這支 schema。
 *
 * `accuracyMeters` 選填：部分裝置不回報精度。缺值時視為未知，
 * 由 service 依政策決定要不要放行（demo 放行，見 §D6 護欄 G3）。
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
 *
 * `from > to` 在這裡擋掉而不是讓 service 回空矩陣：一個空矩陣看起來像
 * 「這段期間沒有任何人出勤」，那是對資料的陳述；而參數寫反是對請求的陳述。
 * 把兩者混成同一個回應，查錯的人會去翻資料庫而不是回頭看自己的網址。
 *
 * **區間上限不在這裡擋**。它需要 `DEMO_ATTENDANCE_MAX_RANGE_DAYS` 與日期運算，
 * 而且要回一個帶得出上限值的專屬錯誤碼 —— 那是 service 的判斷，
 * 不是「這個字串長得對不對」。
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
 * Info: (20260813 - Julian) 緊急點名匯出（A10）。
 *
 * `workLocationId` 選填：不給就匯出全帳本每一個地點。**預設是全部而不是必填**——
 * 火災時打開這個功能的人要的是「樓裡還有誰」，不是「先想清楚是哪一棟」。
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
 *
 * ADR 019 的判準在這裡直接適用：能讓非法狀態不可表示，就不要退而求其次
 * 讓它可被拒絕。寫成 `dayType` 加一個選填的 `shiftPatternId`，
 * 「上班日沒帶班別」與「休假日卻帶了班別」都是**送得進來、要靠 if 擋掉**的請求；
 * 寫成聯集之後，它們連通過解析都做不到。
 *
 * 非上班日刻意要求 `shiftPatternId` 為 `null` 而不是省略 ——
 * 把上班日改成休假時，舊的班別必須被明確清掉，而 `undefined`
 * 在 Prisma 的 `update` 裡的意思是「不要動這個欄位」。
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
