import { isRealCalendarDate } from "@/lib/utils/attendance_time";
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

/**
 * Info: (20260819 - Julian) 「日期＋時刻」的牆上時鐘表示：`"2026-08-19T08:00"`。
 *
 * 用正則而不是 `z.string().datetime()`：後者要求帶時區的完整 ISO 8601，
 * 而這一欄刻意**不帶時區**（見下方 `startAt` 的說明）。
 * 字串比較即時序比較 —— 這也是 `.refine(endAt > startAt)` 成立的理由。
 *
 * Info: (20260819 - Julian) 它取代的是 `leaveDayInputSchema`（已移除）。
 * 那一支驗的是**逐日**的請假輸入，而那個形狀不再由前端送上來 ——
 * 現在收的是一段連續時段，逐日由 `expandLeaveSpan` 在 service 展開。
 * 留著一支沒有任何 payload 會經過的 schema，讀的人會以為那條路還在
 * （同 review B8 的教訓：宣稱守著某件事的東西，必須真的守著）。
 */
export const localDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/)
  /**
   * Info: (20260819 - Julian) 日期部分必須是**真實存在的日曆日**。
   *
   * 第一版只有上面那個正則，於是 `2026-04-31`、`2026-02-30`、甚至
   * `2026-13-01` 全部通過（review 第 1 條）。而它取代的 `isoDateSchema`
   * **有**這道檢查，該處的註解正好寫著「日期字串的定義只該有一份」——
   * 這支就是掉了檢查的第二份。
   *
   * 後果不是 400 變 500，是**一整天的假靜默消失**：`2026-04-31` 查無排班
   * 被跳過，而區間展開時 `Date` 把它正規化成 `05-01` 再往後推，
   * `2026-05-01` 從來沒有進到清單裡 —— 額度不扣、排班不投影成 `LEAVE`、
   * 判定引擎把那天算成無故缺勤。回 200，畫面上看不出任何異常。
   *
   * 判準共用 `isRealCalendarDate`，不再各寫一份。
   */
  .refine(
    (value) => isRealCalendarDate(value.slice(0, 10)),
    "not a real calendar date",
  );

/**
 * Info: (20260817 - Julian) 送出／試算共用同一個輸入形狀。
 *
 * 兩者必須算出完全一樣的東西 —— 試算顯示「會扣 3 天、簽兩關」，
 * 送出卻扣了 4 天，那比沒有試算更糟。共用 schema 是這個保證的第一步。
 *
 * `reason` 去除空白後仍須有內容：一張沒有理由的假單，事後沒有人能判斷
 * 它合不合理（同 `LeaveRequest.reason` 非空的既有理由）。
 */


// Info: (20260813 - Julian) "YYYY-MM-DD"，且必須是真實存在的日曆日（擋掉 2026-02-31）
// Info: (20260813 - Julian) 匯出供假勤共用：日期字串的定義只該有一份
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  // Info: (20260819 - Julian) 判準抽到 `attendance_time.ts`，與 `localDateTimeSchema` 共用同一支
  .refine(isRealCalendarDate, "not a real calendar date");

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
      /**
       * Info: (20260817 - Julian) 這份清單必須涵蓋 `Exclude<WorkDayType, WORK>` 的全部。
       *
       * 少一個的症狀是**畫面選得到、送不出去**：`SUSPENDED` 加進
       * `OFF_DAY_TYPES`（排班面板）之後，這裡沒補，於是型別在
       * `schedule_cell_editor` 的 `onApply` 那一行就對不上 ——
       * 而在型別擋下它之前，那條路徑是「按了沒反應」。
       *
       * ToDo: (20260817 - Julian) 用 `z.nativeEnum` + `refine` 排除 WORK 會更難漏，
       * 但那會讓錯誤訊息從「不是這五個之一」退化成「不符合條件」。
       * 現階段維持列舉，靠 tsc 在呼叫端把漏掉的抓出來。
       */
      dayType: z.enum([
        WorkDayType.REGULAR_OFF,
        WorkDayType.REST_DAY,
        WorkDayType.HOLIDAY,
        WorkDayType.LEAVE,
        WorkDayType.SUSPENDED,
      ]),
      shiftPatternId: z.null(),
    }),
  ]),
);

export type IAttendanceScheduleUpdate = z.infer<
  typeof attendanceScheduleUpdateSchema
>;
