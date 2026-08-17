import { z } from "zod";
import { isoDateSchema } from "@/validators/attendance";
import { LeaveDaySegment } from "@/constants/leave_policy";
import { LEAVE_REASON_MAX_LENGTH } from "@/constants/leave_policy";
import { MINUTES_PER_DAY } from "@/constants/attendance";

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
 * Info: (20260817 - Julian) 當日 00:00 起算的分鐘數，>= 1440 表次日。
 * 上界取兩日：跨夜班的下班時刻最多落在次日，與 `ShiftPattern` 同型別同語意。
 */
const minuteOfDaySchema = z
  .number()
  .int()
  .min(0)
  .max(MINUTES_PER_DAY * 2 - 1);

/**
 * Info: (20260817 - Julian) 一天的請假。
 *
 * `startMinute` / `endMinute` **只在 CUSTOM 有意義**，用 superRefine 表達
 * 而非做成兩個 schema 的聯集：後者會讓錯誤訊息指向「沒有符合任何一種形狀」，
 * 而使用者要的是「你選了自訂時段但沒填起訖」。
 */
export const leaveDayInputSchema = z
  .object({
    workDate: isoDateSchema,
    segment: z.enum([
      LeaveDaySegment.FULL,
      LeaveDaySegment.MORNING,
      LeaveDaySegment.AFTERNOON,
      LeaveDaySegment.CUSTOM,
    ]),
    startMinute: minuteOfDaySchema.optional(),
    endMinute: minuteOfDaySchema.optional(),
  })
  .superRefine((value, ctx) => {
    const isCustom = value.segment === LeaveDaySegment.CUSTOM;
    const hasRange =
      value.startMinute !== undefined && value.endMinute !== undefined;

    if (isCustom && !hasRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CUSTOM segment requires startMinute and endMinute",
        path: ["startMinute"],
      });
      return;
    }
    // Info: (20260817 - Julian) 反方向也擋：留著一組不會被讀的起訖，看起來像設定卻沒有效果
    if (!isCustom && (value.startMinute !== undefined || value.endMinute !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startMinute and endMinute are only meaningful for CUSTOM",
        path: ["startMinute"],
      });
      return;
    }
    if (
      hasRange &&
      (value.endMinute as number) <= (value.startMinute as number)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endMinute must be after startMinute",
        path: ["endMinute"],
      });
    }
  });

/**
 * Info: (20260817 - Julian) 送出／試算共用同一個輸入形狀。
 *
 * 兩者必須算出完全一樣的東西 —— 試算顯示「會扣 3 天、簽兩關」，
 * 送出卻扣了 4 天，那比沒有試算更糟。共用 schema 是這個保證的第一步。
 *
 * `reason` 去除空白後仍須有內容：一張沒有理由的假單，事後沒有人能判斷
 * 它合不合理（同 `LeaveRequest.reason` 非空的既有理由）。
 */
export const leaveRequestCreateSchema = z.object({
  leavePolicyId: z.string().min(1),
  reason: z.string().trim().min(1).max(LEAVE_REASON_MAX_LENGTH),
  /**
   * Info: (20260817 - Julian) 逐日展開由前端送上來，而不是送起迄由後端展開：
   * 一趟請假中間可能夾著例假日與國定假日，哪幾天要請是使用者的決定，
   * 不是一段區間能表達的（同 `LeaveDay` 拆成逐日的既有理由）。
   */
  days: z.array(leaveDayInputSchema).min(1).max(62),
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

export type ILeaveDayInputPayload = z.infer<typeof leaveDayInputSchema>;
export type ILeaveRequestCreatePayload = z.infer<
  typeof leaveRequestCreateSchema
>;
export type ILeaveDecisionPayload = z.infer<typeof leaveDecisionSchema>;
export type ILeaveRequestListQuery = z.infer<
  typeof leaveRequestListQuerySchema
>;
