import { z } from "zod";
import { isoDateSchema } from "@/validators/attendance";
import { LEAVE_REASON_MAX_LENGTH } from "@/constants/leave_policy";
/**
 * Info: (20260820 - Julian) `localDateTimeSchema` 搬到 `validators/attendance.ts`
 * （review 第 4 輪第 2 條）。它是**整個假勤模組**的牆上時鐘原語，不是假單
 * 專屬的欄位型別 —— 加班的 §32 IV 報備時點也要用它，而讓 `overtime.ts`
 * 去 import `leave_request.ts` 會憑空造出一條假單→加班的相依。
 * 它的姊妹 `isoDateSchema` 本來就在那裡，而 `attendance_time.ts` 的註解
 * 早就把兩者當成一對在講。
 */
import { localDateTimeSchema } from "@/validators/attendance";

/**
 * Info: (20260817 - Julian) 請假送出、試算與簽核的 Payload 驗證。
 *
 * 依 coding_guidelines §2.3，Zod schema **嚴禁寫在 `route.ts` 內** ——
 * route 只負責 `Schema.safeParse(body)`。
 *
 * 這一層擋的是「欄位型別對不對」；「這些欄位放在一起說不說得通」
 * （例如自訂時段卻沒帶起訖）由 service 與引擎負責，那需要班別資訊。
 */

export const leaveRequestCreateSchema = z
  .object({
    leavePolicyId: z.string().min(1),
    reason: z.string().trim().min(1).max(LEAVE_REASON_MAX_LENGTH),
    /**
     * Info: (20260819 - Julian) 起訖各是一個「日期＋時刻」（`"2026-08-19T08:00"`）。
     *
     * ## 為什麼改掉逐日展開
     *
     * 原本這裡收的是 `days: [{ workDate, segment, startMinute, endMinute }]`，
     * 註解寫著「逐日展開由前端送上來…哪幾天要請是使用者的決定」。
     * 那在「每天都請上午半天」的用法下成立，但這套系統服務的是**工地**：
     * 每個人的工時不同、上下班時間不同，而「我從 8/19 早上八點走到 8/21 下午五點」
     * 是一段**連續**的時間，不是三個各自獨立的半天。
     *
     * 改成起訖之後，展開必須在伺服器做 —— 首日要請到當天班別結束為止，
     * 而前端不知道那個人那一天的班到幾點。硬讓它猜，症狀是首日多扣或少扣
     * 半小時，而畫面上看起來完全正常（見 `leave_span.ts`）。
     *
     * ## 為什麼不收帶時區的 ISO 8601
     *
     * 使用者填的是**牆上時鐘**。收 `2026-08-19T08:00:00+08:00` 會讓
     * 「時區換算」這件事出現在一個它沒有意義的地方 —— 政策時區由伺服器決定
     * （`DEMO_TIME_ZONE`），而不是由送單的裝置決定。
     */
    startAt: localDateTimeSchema,
    endAt: localDateTimeSchema,
  })
  .refine((value) => value.endAt > value.startAt, {
    message: "endAt must be after startAt",
    path: ["endAt"],
  });

// Info: (20260817 - Julian) 簽核與駁回。`comment` 對駁回特別有意義，但不強制——強制填理由才能駁回，本身就是一種壓力
export const leaveDecisionSchema = z.object({
  comment: z.string().trim().max(LEAVE_REASON_MAX_LENGTH).optional(),
});

/**
 * Info: (20260817 - Julian) 假單清單查詢。
 * 區間上限不在這裡擋：它需要專屬錯誤碼與日期運算，屬 service 的判斷
 * （同 `attendanceResultQuerySchema` 的既有處置）。
 */
export const leaveRequestListQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    employeeId: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      value.from === undefined ||
      value.to === undefined ||
      value.from <= value.to,
    { message: "from must not be after to", path: ["from"] },
  );

export type ILeaveRequestCreatePayload = z.infer<
  typeof leaveRequestCreateSchema
>;
export type ILeaveDecisionPayload = z.infer<typeof leaveDecisionSchema>;
export type ILeaveRequestListQuery = z.infer<
  typeof leaveRequestListQuerySchema
>;
