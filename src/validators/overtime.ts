import { z } from "zod";
import { isoDateSchema } from "@/validators/attendance";
import { MINUTES_PER_DAY } from "@/constants/attendance";
import {
  OVERTIME_REASON_MAX_LENGTH,
  OvertimeCompensationMode,
  OvertimeFilingType,
} from "@/constants/overtime";

/**
 * Info: (20260818 - Julian) 加班單送出與決行的 Payload 驗證。
 *
 * 依 coding_guidelines §2.3，Zod schema 嚴禁寫在 `route.ts` 內。
 * 這一層擋的是「欄位型別對不對」；「這些欄位放在一起說不說得通」
 * （事前／事後與送出時點是否相符、那一天是不是例假）由不變式與 service 負責，
 * 那需要班別與時區資訊。
 */

/**
 * Info: (20260818 - Julian) 當日 00:00 起算的分鐘數，>= 1440 表次日。
 * 上界取兩日：跨夜加班的結束時刻最多落在次日，與 `ShiftPattern` 同型別同語意。
 */
const minuteOfDaySchema = z
  .number()
  .int()
  .min(0)
  .max(MINUTES_PER_DAY * 2 - 1);

/**
 * Info: (20260818 - Julian) 送出加班單。
 *
 * `reason` 去除空白後仍須有內容：一張沒有理由的加班單，事後沒有人能判斷
 * 它合不合理（同 `OvertimeRequest.reason` 非空的既有理由）。
 *
 * `compensationMode` 由**員工**選（§32-1「勞工得選擇」），因此它在送出的
 * payload 裡而不是核准的 payload 裡 —— 放在後者等於讓主管替他決定。
 */
export const overtimeRequestCreateSchema = z
  .object({
    workDate: isoDateSchema,
    filingType: z.enum([
      OvertimeFilingType.ADVANCE,
      OvertimeFilingType.POST_HOC,
    ]),
    compensationMode: z.enum([
      OvertimeCompensationMode.PAYMENT,
      OvertimeCompensationMode.COMPENSATORY_LEAVE,
    ]),
    requestedStartMinute: minuteOfDaySchema,
    requestedEndMinute: minuteOfDaySchema,
    reason: z.string().trim().min(1).max(OVERTIME_REASON_MAX_LENGTH),
    /**
     * Info: (20260818 - Julian) §32 IV 天災事變等情形且**已報備**。
     * 預設 false：它會讓整段加班跳到加倍發給並繞過例假的 §40 閘門，
     * 那不是一個可以靠忘記填就成立的狀態。
     */
    isEmergency: z.boolean().default(false),
  })
  .refine((value) => value.requestedEndMinute > value.requestedStartMinute, {
    message: "requestedEndMinute must be after requestedStartMinute",
    path: ["requestedEndMinute"],
  });

/**
 * Info: (20260818 - Julian) 核准。
 *
 * `approvedMinutes` 可省略（照申請的整段核准），但**可以少於申請** ——
 * 主管核 2 小時而申請 3 小時是常態。多於申請則由 service 擋：
 * 核准一個沒有人申請過的時段，事後沒有東西可以對。
 */
export const overtimeApprovalSchema = z.object({
  approvedMinutes: z.number().int().min(0).optional(),
});

export type IOvertimeRequestCreatePayload = z.infer<
  typeof overtimeRequestCreateSchema
>;
export type IOvertimeApprovalPayload = z.infer<typeof overtimeApprovalSchema>;

/**
 * Info: (20260818 - Julian) 加班單清單查詢（L24）。
 *
 * 區間上限不在這裡擋：它需要專屬錯誤碼與日期運算，屬 service 的判斷
 * （同 `leaveRequestListQuerySchema` 的既有處置）。
 */
export const overtimeRequestListQuerySchema = z
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

/**
 * Info: (20260818 - Julian) 月份統計查詢（L28）。
 *
 * 用 "YYYY-MM" 而不是起訖日：§32 II 的上限是**曆月**的，
 * 讓呼叫端自己給區間會讓「這個月加了幾小時」變成一個各處算法不同的問題。
 */
export const overtimeSummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  employeeId: z.string().min(1).optional(),
});

// Info: (20260818 - Julian) 未核准時段查詢（L29）。起訖必填：它是一份要人去看的清單，不是全歷史
export const overtimeUnapprovedQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    employeeId: z.string().min(1).optional(),
  })
  .refine((value) => value.from <= value.to, {
    message: "from must not be later than to",
    path: ["from"],
  });

/**
 * Info: (20260818 - Julian) 加班政策（L30）。
 *
 * 全量取代：送上來的是一份完整的政策。把「沒送的欄位就不動」當成語意，
 * 會讓「取消同意」變成沒有辦法表達的動作。
 *
 * `agreementRecordUrl` 與 `agreedAt` 的必填關係不在這裡擋 —— 那是
 * `assertOvertimePolicy` 的職責，而它必須守住 seed 與資料遷移這些
 * 不經過 validator 的路徑。
 */
export const overtimePolicyUpdateSchema = z.object({
  extendedLimitAgreed: z.boolean(),
  agreementRecordUrl: z.string().trim().url().nullable().default(null),
  agreedAt: z.string().datetime().nullable().default(null),
  /** Info: (20260818 - Julian) §32-1 無法定日數，null 表尚未協商 —— 那時換不了補休 */
  compensatoryExpiryMonths: z.number().int().min(1).nullable().default(null),
});

export type IOvertimeRequestListQuery = z.infer<
  typeof overtimeRequestListQuerySchema
>;
export type IOvertimeSummaryQuery = z.infer<typeof overtimeSummaryQuerySchema>;
export type IOvertimeUnapprovedQuery = z.infer<
  typeof overtimeUnapprovedQuerySchema
>;
export type IOvertimePolicyUpdatePayload = z.infer<
  typeof overtimePolicyUpdateSchema
>;
