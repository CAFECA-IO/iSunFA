import { z } from "zod";
import { isoDateSchema, localDateTimeSchema } from "@/validators/attendance";
import { isSafeHttpUrl } from "@/lib/utils/safe_url";
import { MINUTES_PER_DAY } from "@/constants/attendance";
import {
  OVERTIME_EMERGENCY_REPORT_URL_MAX_LENGTH,
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
     * Info: (20260819 - Julian) `isEmergency` **不在這裡**（review B7）。
     *
     * 它原本是申請人自填的一個布林值，而它的兩個後果都對填單的人有利：
     * 整段加班跳到 `EMERGENCY_DOUBLE`（加倍發給），且它曾經還會繞過
     * 例假日的閘門 —— 沒有佐證欄位、沒有 HR 覆核、沒有主管機關報備紀錄。
     * §32 IV 的構成要件是「天災、事變或突發事件」**且**已依法報備，
     * 而後者是一件對外發生的事，不是申請單上的一個勾選框。
     *
     * 現在由具 `HR_ADMIN` 職能者在**核准之前**登記，並強制附上報備紀錄
     * （見 `overtimeEmergencyDeclareSchema`）。標準與 §32 III
     * 54 小時放寬一致：一個沒有記載的「已報備」等於沒有報備。
     */
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

/**
 * Info: (20260819 - Julian) §32 IV 天災事變的認定（review B7）。
 *
 * ## 為什麼自成一支 schema 而不是掛在核准的 payload 上
 *
 * 第一版把它做成核准的一個欄位，結果撞上一個結構性的空集合：核准要求
 * 「管得到他的主管」，認定要求 `HR_ADMIN`，而一般組織裡沒有人同時是兩者。
 * 拆開之後順序也對了 —— 實務上是 HR 先報備、拿到紀錄，這張單才帶著
 * 加倍發給的性質進到主管手上。
 *
 * 兩個欄位都必填，沒有預設值：這是「有沒有這回事」的認定，
 * 不是一個可以靠忘記填就成立的狀態（repository 端由
 * `assertOvertimeEmergencyRecord` 再擋一次，因為 seed 與資料遷移
 * 不會經過這個 schema）。
 *
 * Info: (20260820 - Julian) `reportedAt` 改收**牆上時鐘**（review 第 4 輪第 2 條）。
 *
 * 原本收帶時區的 ISO 8601，而前端是用 `new Date(值).toISOString()` 組出來的
 * —— 那個 `new Date` 用的是**送單裝置的時區**。人資把筆電時區設成 UTC、
 * 或人在國外處理台灣的單子，記下來的報備時點就整整差了幾個小時，
 * 而 §32 IV 的「二十四小時內」正是拿這一欄算的。
 *
 * 同一輪的 `leaveRequestCreateSchema` 剛好把相反的原則寫下來了：
 * 「政策時區由伺服器決定（`DEMO_TIME_ZONE`），而不是由送單的裝置決定。」
 * 這裡改成共用同一支 `localDateTimeSchema`，換算交給 service ——
 * 使用者填的是牆上時鐘，那就讓它一路是牆上時鐘，直到伺服器才變成時點。
 */
export const overtimeEmergencyDeclareSchema = z.object({
  /**
   * Info: (20260820 - Julian) **要是一個能點的 http(s) 連結**（review 第 1 條）。
   *
   * 原本只有 `.trim().min(1).max(500)`，於是三件事同時成立：
   *
   * 1. `N/A` 通過 —— 而 `OVERTIME_EMERGENCY_REPORT_URL_MAX_LENGTH` 的註解
   *    自己寫著「一個填了 `N/A` 的必填欄位，比沒有這個欄位更糟：它看起來
   *    像有記載」。B7 把這一欄從自填布林值改成強制記載，就是為了不再有
   *    「看起來像有記載」的狀態。
   * 2. 它直接進 `<a href={...}>`，於是 `javascript:` 進得了 href。
   * 3. 同一個檔案的同型欄位 `agreementRecordUrl` 有 `.url()`，這裡沒有 ——
   *    同一份 schema 檔裡兩種標準，讀的人會以為寬的那個是刻意的。
   *
   * `.url()` 也不夠：zod 走 `new URL()`，`javascript:alert(1)` 會通過
   * （實測 zod 4.4.3）。協定白名單見 `isSafeHttpUrl`。
   */
  reportUrl: z
    .string()
    .trim()
    .min(1)
    .max(OVERTIME_EMERGENCY_REPORT_URL_MAX_LENGTH)
    .refine(isSafeHttpUrl, {
      message: "reportUrl must be an http(s) URL",
    }),
  reportedAt: localDateTimeSchema,
});

/**
 * Info: (20260820 - Julian) 撤回 §32 IV 的認定（review 第 2 條）。
 *
 * 理由必填且沒有預設值：撤回的是一件**對外發生過**的事，
 * 而「為什麼撤回」是事後唯一能分辨「報備被主管機關退回」與
 * 「當初認定錯了」的資訊。與 `LeaveRequest.reason` 非空同一條理由。
 */
export const overtimeEmergencyRevokeSchema = z.object({
  reason: z.string().trim().min(1).max(OVERTIME_REASON_MAX_LENGTH),
});

export type IOvertimeEmergencyRevokePayload = z.infer<
  typeof overtimeEmergencyRevokeSchema
>;

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
    /**
     * Info: (20260820 - Julian) `team` = 我管得到的每一個人（review 第 6 輪 M23）。
     *
     * 預設是本人，因為那是「我的加班」頁的用法。簽核頁要的是團隊，
     * 而它先前**沒有任何方式表達那件事** —— 於是主管在簽核頁上看到的是
     * 自己的未核准時段，下屬的永遠不會出現。
     *
     * 與 `employeeId` 互斥：兩個都給就講不清楚要哪一個。
     */
    scope: z.enum(["self", "team"]).default("self"),
  })
  .refine((value) => !(value.scope === "team" && value.employeeId), {
    message: "scope=team cannot be combined with employeeId",
    path: ["scope"],
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
  /**
   * Info: (20260820 - Julian) `.url()` 擋不掉 `javascript:`（review 第 1 條）——
   * zod 走的是 `new URL()`，而它認得所有協定。這一欄同樣會被畫成連結。
   */
  agreementRecordUrl: z
    .string()
    .trim()
    .refine(isSafeHttpUrl, {
      message: "agreementRecordUrl must be an http(s) URL",
    })
    .nullable()
    .default(null),
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

/**
 * Info: (20260818 - Julian) 撤回加班單。
 *
 * `reason` 在這一層是選填 —— 「事後補單必須填」需要知道這張單的 `filingType`，
 * 而那要查資料庫，是 service 的判斷（同 `leaveRequestListQuerySchema` 把區間
 * 上限留給 service 的既有處置）。這一層只擋型別與長度。
 */
export const overtimeWithdrawSchema = z.object({
  reason: z.string().trim().max(OVERTIME_REASON_MAX_LENGTH).optional(),
});

export type IOvertimeWithdrawPayload = z.infer<typeof overtimeWithdrawSchema>;
