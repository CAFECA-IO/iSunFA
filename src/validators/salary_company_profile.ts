import { z } from "zod";
import { LeaveYearScheme } from "@/generated";

/**
 * Info: (20260914 - Julian) 公司設定的 Payload 驗證。
 *
 * 依 CLAUDE.md §2，Zod schema 嚴禁寫在 `route.ts` 內 ——
 * route 只負責 `Schema.safeParse(body)`。
 */

/**
 * Info: (20260914 - Julian) 空字串與「沒填」是同一件事，都存成 `null`。
 *
 * 表單清空一個可空欄位送出來的是 `""`，而資料庫裡「沒填」是 `null`。
 * 不正規化的話，同一個「沒填」會有兩種表示 —— 而下一個人寫
 * `taxId ?? "—"` 的時候，空字串會穿過 `??` 顯示成一格空白。
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value));

export const AccountBookCompanyProfileSchema = z
  .object({
    // Info: (20260914 - Julian) 唯一必填：它是薪資單與工資清冊上的署名
    entityName: z.string().trim().min(1).max(100),
    taxId: optionalText(20),
    responsiblePerson: optionalText(50),
    address: optionalText(200),

    /**
     * Info: (20260914 - Julian) 可以不選，但不能選一個不存在的制度。
     *
     * `null` ＝ 還沒選，是一個合法且**看得出來**的狀態
     * （見 `IAccountBookCompanyProfile` 的說明）。
     */
    leaveYearScheme: z.nativeEnum(LeaveYearScheme).nullable().default(null),
    leaveYearStartMonth: z
      .number()
      .int()
      .min(1)
      .max(12)
      .nullable()
      .default(null),
    leaveYearStartDay: z.number().int().min(1).max(31).nullable().default(null),
  })
  /**
   * Info: (20260914 - Julian) 起日與制度必須自洽，而且是**雙向**的。
   *
   * 只擋「CUSTOM 沒給起日」的話，另一個方向會留著：選了週年制卻帶著
   * 上一次 CUSTOM 的 3/1 —— 那組數字不會被用到，但它會留在資料庫裡，
   * 而下一個讀它的人分不出那是設定還是殘留。
   *
   * 週年制的起算日由各員工的到職日決定（細則 §5：年資自受僱當日起算），
   * 曆年制固定 1/1 —— 兩者都不該由使用者再填一次。
   */
  .superRefine((value, ctx) => {
    const needsStart = value.leaveYearScheme === LeaveYearScheme.CUSTOM;
    const hasStart =
      value.leaveYearStartMonth !== null && value.leaveYearStartDay !== null;

    if (needsStart && !hasStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leaveYearStartMonth"],
        message: "custom leave year scheme requires a start month and day",
      });
    }

    if (!needsStart && !hasStart) return;

    if (!needsStart && hasStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leaveYearStartMonth"],
        message:
          "leave year start month/day is only meaningful for the custom scheme",
      });
    }
  });

export type IAccountBookCompanyProfilePayload = z.infer<
  typeof AccountBookCompanyProfileSchema
>;
