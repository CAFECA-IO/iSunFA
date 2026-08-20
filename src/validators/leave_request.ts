import { isRealCalendarDate } from "@/lib/utils/attendance_time";
import { z } from "zod";
import { isoDateSchema } from "@/validators/attendance";
import { LEAVE_REASON_MAX_LENGTH } from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) 請假送出、試算與簽核的 Payload 驗證。
 *
 * 依 coding_guidelines §2.3，Zod schema **嚴禁寫在 `route.ts` 內** ——
 * route 只負責 `Schema.safeParse(body)`。
 *
 * 這一層擋的是「欄位型別對不對」；「這些欄位放在一起說不說得通」
 * （例如自訂時段卻沒帶起訖）由 service 與引擎負責，那需要班別資訊。
 */

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
