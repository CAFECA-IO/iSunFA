import { LeaveApprovalNodeKind } from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) 簽核規則設定的 DTO。
 *
 * 與 `leave_approval_chain.ts` 的 `IApprovalRuleWithSteps` 刻意分開：
 * 那一份是**引擎的輸入**（只有展開簽核鏈需要的欄位、沒有 id），
 * 這一份是**設定畫面的往返**（要 id 才改得動、要順序才顯示得出來）。
 * 合成一份會讓引擎的輸入型別跟著設定畫面的需求漂移。
 */

/**
 * Info: (20260817 - Julian) 一個 scope = 帳本 × 假別。
 * `leavePolicyId = null` 是通則，適用所有沒有專屬規則的假別。
 */
export interface IApprovalRuleScope {
  leavePolicyId: string | null;
}

export interface IApprovalRuleStepInput {
  nodeKind: LeaveApprovalNodeKind;
  /** Info: (20260817 - Julian) 僅 `SPECIFIC_EMPLOYEE` 有意義，其餘必須為 null */
  specificEmployeeId?: string | null;
}

export interface IStorableApprovalRule {
  /** Info: (20260817 - Julian) 下界（含），以天為單位。可為小數（半天） */
  minDays: number;
  /** Info: (20260817 - Julian) 上界（不含）。null 表無上界，且必須是最後一條 */
  maxDays: number | null;
  steps: readonly IApprovalRuleStepInput[];
}

export interface IApprovalRuleStepView extends IApprovalRuleStepInput {
  order: number;
  specificEmployeeId: string | null;
}

export interface IApprovalRuleView {
  id: string;
  leavePolicyId: string | null;
  minDays: number;
  maxDays: number | null;
  steps: IApprovalRuleStepView[];
}

/** Info: (20260817 - Julian) L31 的回應：整個帳本的規則，依 scope 分組後回傳 */
export interface IApprovalRuleListView {
  /** Info: (20260817 - Julian) 通則。空陣列代表尚未設定 —— 那會讓所有假單送不出去 */
  general: IApprovalRuleView[];
  /** Info: (20260817 - Julian) 假別專屬規則，key 為 `leavePolicyId` */
  byPolicy: Record<string, IApprovalRuleView[]>;
}
