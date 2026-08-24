import { z } from "zod";
import { LeaveApprovalNodeKind } from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) 簽核規則設定的 Payload 驗證（L32）。
 *
 * 依 coding_guidelines §2.3，Zod schema **嚴禁寫在 `route.ts` 內**。
 *
 * 這一層只擋「欄位型別對不對」。三件事**刻意不在這裡擋**，
 * 因為它們是集合層級或需要資料庫：
 *
 * 1. 區間是不是 `[0, ∞)` 的一個分割 → `assertRuleRangesDisjoint`（repository）
 * 2. 指名節點與指名對象是否成對 → service（它要回一個看得懂的錯誤碼）
 * 3. `specificEmployeeId` 指的人在不在這個帳本 → 外鍵
 *
 * 把 1 搬到 Zod 是做得到的（`superRefine` 拿得到整個陣列），但那會讓
 * 同一條規則有兩份實作 —— 而 seed 與資料遷移不經過 Zod。
 */

const nodeKindSchema = z.enum([
  LeaveApprovalNodeKind.DIRECT_MANAGER,
  LeaveApprovalNodeKind.DEPARTMENT_MANAGER,
  LeaveApprovalNodeKind.HR,
  LeaveApprovalNodeKind.SPECIFIC_EMPLOYEE,
]);

/**
 * Info: (20260817 - Julian) 天數。允許小數（半天 = 0.5），上界取 366。
 *
 * 366 不是隨便挑的：一次請超過一年的假在現行模型裡不是「很長的假」，
 * 是「留職停薪」，而那是另一個制度 —— 用同一張假單表達它，
 * 會讓額度扣抵去扣一個不存在的批次。
 */
/**
 * Info: (20260820 - Julian) 必須是**可對帳的十進位**（review 第 4 條）。
 *
 * 原本只有 `min(0).max(366)`，於是 `1e-7` 通過 —— 而 `String(1e-7)` 是
 * `"1e-7"`（JS 對絕對值小於 `1e-6` 的數字一律用指數記號），落地又讀回之後，
 * `compareDaysTo` 的 `exactRationalOf` 對它直接丟 `LeaveRuleError`。
 * 那個丟出來的地方**不在** service 那個「`LeaveRuleError` → 400」的 try 裡，
 * 於是該帳本的每一次試算與送出都變成 500。改成精確比較之前它只是一次
 * 數值比較、不會炸 —— 這是新核心引進的迴歸。
 *
 * 小數位上限三位：簽核門檻是寫在人事規章裡的數字，半天（0.5）與
 * 四分之一天（0.25）都在三位之內。同一條規矩在
 * `assertPlainDecimalThreshold` 再擋一次（seed 與資料遷移不經過這裡）。
 */
const MAX_THRESHOLD_DECIMALS = 3;

const daysSchema = z
  .number()
  .min(0)
  .max(366)
  .refine((value) => !String(value).includes("e") && !String(value).includes("E"), {
    message: "days must be a plain decimal, not exponential notation",
  })
  .refine(
    (value) => {
      const text = String(value);
      const dot = text.indexOf(".");
      return (dot === -1 ? 0 : text.length - dot - 1) <= MAX_THRESHOLD_DECIMALS;
    },
    { message: `days must have at most ${MAX_THRESHOLD_DECIMALS} decimal places` },
  );

const ruleStepSchema = z.object({
  nodeKind: nodeKindSchema,
  specificEmployeeId: z.string().uuid().nullable().optional(),
});

const ruleSchema = z.object({
  minDays: daysSchema,
  maxDays: daysSchema.nullable(),
  // Info: (20260817 - Julian) 上限 6：超過六關的簽核流程在實務上是設定錯誤，不是需求
  steps: z.array(ruleStepSchema).min(1).max(6),
});

/**
 * Info: (20260817 - Julian) `leavePolicyId` 為 null 即通則。
 *
 * 用 `null` 而不是省略欄位：省略讀起來像「忘了填」，而通則是一個
 * 明確的選擇。前端送 `{ leavePolicyId: null }` 是在說「我要改的是通則」。
 */
export const leaveApprovalRuleReplaceSchema = z.object({
  leavePolicyId: z.string().uuid().nullable(),
  rules: z.array(ruleSchema).max(20),
});

export type ILeaveApprovalRuleReplaceInput = z.infer<
  typeof leaveApprovalRuleReplaceSchema
>;
