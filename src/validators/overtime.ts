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
