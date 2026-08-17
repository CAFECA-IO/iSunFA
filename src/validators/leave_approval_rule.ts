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
const daysSchema = z.number().min(0).max(366);

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
