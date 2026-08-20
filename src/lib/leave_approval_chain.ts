import {
  compareDaysTo,
  exactDaysToDecimalString,
  IExactDays,
  LeaveRuleError,
} from "@/lib/leave_entitlement_rules";
import { LeaveApprovalNodeKind } from "@/constants/leave_policy";
import {
  IApprovalChainInput,
  IApprovalChainResolution,
  IApprovalOrgSnapshot,
  IApprovalRuleWithSteps,
  IApproverIdentity,
  IResolvedApprovalStep,
  LeaveApprovalUnresolvedReason,
} from "@/interfaces/leave_request";

/**
 * Info: (20260817 - Julian) 簽核鏈展開：純函數，無 DB／I/O，**不呼叫 `Date.now()`**。
 *
 * 組織的走訪（沿部門樹向上找主管、查誰有 HR 角色）在 repository 完成後以
 * `IApprovalOrgSnapshot` 傳入 —— 一個會自己查組織的展開函數，其結果無法在
 * 測試裡完整重現，而簽核路徑正是爭議時最需要重現的東西。
 *
 * 展開的結果是**快照**：解析當下的工號與姓名一併帶出，寫入 `LeaveApprovalStep`
 * 後不隨組織異動改變（ADR 023 §2）。
 */

// Info: (20260817 - Julian) 展開規則改版時 +1，並記於快照；舊單據仍能說明它當初是依哪一版展開的
export const LEAVE_APPROVAL_CHAIN_VERSION = 1;

/**
 * Info: (20260817 - Julian) 自我核准時的上升階梯。
 *
 * 「老闆自己請假」不是錯誤狀態，是每個組織都會發生的常態。做成錯誤只會
 * 逼出一個繞過簽核的後門（ADR 023 §5）。因此節點解析出申請人本人時
 * **自動上升到下一級**，並在快照記下理由。
 */
const ESCALATION_LADDER: readonly LeaveApprovalNodeKind[] = [
  LeaveApprovalNodeKind.DIRECT_MANAGER,
  LeaveApprovalNodeKind.DEPARTMENT_MANAGER,
  LeaveApprovalNodeKind.HR,
];

export function resolveApprovalChain(
  input: IApprovalChainInput,
): IApprovalChainResolution {
  /**
   * Info: (20260820 - Julian) 門檻壞掉是**設定缺口**，不是故障（review 第 4 條）。
   *
   * `compareDaysTo` 對指數記號的門檻會丟 `LeaveRuleError`（B5 的規矩：
   * 還原不回分數的數字不能拿來比對）。而這支函式的呼叫點在 `buildPlan`
   * 的 `:752`，**不在**上面那個「`LeaveRuleError` → 400」的 try 裡面 ——
   * 於是一列 `minDays = 1e-7` 的規則會讓該帳本的試算與送出全部 500。
   *
   * 收在這裡而不是在 service 再包一層 try：這支函式的契約就是
   * 「展得開回步驟，展不開回原因」，而門檻讀不懂正是一種展不開。
   * 在外面包 try 的話，每一個呼叫端都要記得包（而 `preview` 與 `submit`
   * 是兩個呼叫端）。
   */
  let rule: IApprovalRuleWithSteps | null;
  try {
    rule = selectRule(input.rules, input.leavePolicyId, input.totalDays);
  } catch (error) {
    if (!(error instanceof LeaveRuleError)) throw error;
    return {
      ok: false,
      reason: LeaveApprovalUnresolvedReason.MALFORMED_RULE_THRESHOLD,
      detail: `a rule threshold cannot be read as a plain decimal: ${error.message}`,
    };
  }
  if (rule === null) {
    return {
      ok: false,
      reason: LeaveApprovalUnresolvedReason.NO_MATCHING_RULE,
      detail: `no rule covers ${exactDaysToDecimalString(input.totalDays)} day(s) for policy ${input.leavePolicyId}`,
    };
  }
  if (rule.steps.length === 0) {
    return {
      ok: false,
      reason: LeaveApprovalUnresolvedReason.EMPTY_RULE_STEPS,
      detail: `rule [${rule.minDays}, ${rule.maxDays ?? "inf"}) has no steps`,
    };
  }

  const resolved: IResolvedApprovalStep[] = [];
  const orderedSteps = [...rule.steps].sort((a, b) => a.order - b.order);

  for (const step of orderedSteps) {
    const outcome = resolveNode(
      step.nodeKind,
      step.specificEmployeeId,
      input.org,
    );
    if (!outcome.ok) return outcome;
    resolved.push({
      order: resolved.length,
      nodeKind: outcome.nodeKind,
      approver: outcome.approver,
      mergedFromKinds: [],
      escalatedReason: outcome.escalatedReason,
    });
  }

  return { ok: true, steps: dedupeAdjacent(resolved) };
}

/**
 * Info: (20260817 - Julian) 選出命中的規則。
 *
 * 假別專屬規則存在時**完全取代**通則，不混用（ADR 023 §5 的說明）：
 * 若允許「特休 0–3 天用專屬、3 天以上退回通則」，一張假單的簽核路徑
 * 就取決於兩張表的交互作用 —— 改了通則之後，特休的長假流程會跟著變、
 * 短假卻沒變，而沒有人預期得到。
 *
 * 區間為左閉右開：`[0, 3)` 與 `[3, ∞)`，恰好 3 天走長假規則。
 */
const selectRule = (
  rules: readonly IApprovalRuleWithSteps[],
  leavePolicyId: string,
  totalDays: IExactDays,
): IApprovalRuleWithSteps | null => {
  const specific = rules.filter((r) => r.leavePolicyId === leavePolicyId);
  const scope =
    specific.length > 0
      ? specific
      : rules.filter((r) => r.leavePolicyId === null);
  return (
    scope.find(
      (r) =>
        // Info: (20260819 - Julian) 左閉右開，且比較必須精確（review B5、ADR 023 §2.2）
        compareDaysTo(totalDays, r.minDays) >= 0 &&
        (r.maxDays === null || compareDaysTo(totalDays, r.maxDays) < 0),
    ) ?? null
  );
};

type INodeOutcome =
  | {
      ok: true;
      nodeKind: LeaveApprovalNodeKind;
      approver: IApproverIdentity;
      escalatedReason: string | null;
    }
  | { ok: false; reason: LeaveApprovalUnresolvedReason; detail: string };

const resolveNode = (
  nodeKind: LeaveApprovalNodeKind,
  specificEmployeeId: string | null,
  org: IApprovalOrgSnapshot,
): INodeOutcome => {
  const startIndex = ESCALATION_LADDER.indexOf(nodeKind);
  const candidate = candidateFor(nodeKind, specificEmployeeId, org);
  if (!candidate.ok) return candidate;

  if (candidate.employeeId !== org.applicantEmployeeId) {
    return identify(nodeKind, candidate.employeeId, org, null);
  }

  /**
   * Info: (20260817 - Julian) 解析出來的人就是申請人本人。
   *
   * **先在同一個節點型別裡換人，再談上升。** 這條只對 `HR` 有效果
   * （它是「任一人簽核即通過」的池），但那正是最常見的情形：
   * 人資自己請假，該由另一位人資簽，而不是被推到一個不存在的更高層級。
   * 其餘節點型別只有一個候選人，這次重試會拿到同一個人而被略過。
   */
  const sameKind = candidateFor(
    nodeKind,
    specificEmployeeId,
    org,
    org.applicantEmployeeId,
  );
  if (sameKind.ok && sameKind.employeeId !== org.applicantEmployeeId) {
    return identify(
      nodeKind,
      sameKind.employeeId,
      org,
      `${nodeKind} resolved to the applicant; another approver of the same kind was selected`,
    );
  }

  /**
   * Info: (20260817 - Julian) 同型別換不了人，才沿階梯往上找。
   *
   * `SPECIFIC_EMPLOYEE` 不在階梯上（`indexOf` 回 -1），從 HR 開始找：
   * 指名的簽核者恰好是申請人是設定問題，但把它做成錯誤同樣會卡住請假。
   */
  const from = startIndex >= 0 ? startIndex + 1 : ESCALATION_LADDER.length - 1;
  for (let i = from; i < ESCALATION_LADDER.length; i += 1) {
    const higher = ESCALATION_LADDER[i];
    const next = candidateFor(higher, null, org, org.applicantEmployeeId);
    if (!next.ok) continue;
    if (next.employeeId === org.applicantEmployeeId) continue;
    return identify(
      higher,
      next.employeeId,
      org,
      `${nodeKind} resolved to the applicant; escalated to ${higher}`,
    );
  }

  return {
    ok: false,
    reason:
      nodeKind === LeaveApprovalNodeKind.HR
        ? LeaveApprovalUnresolvedReason.NO_OTHER_HR
        : LeaveApprovalUnresolvedReason.NO_HR,
    detail: `${nodeKind} resolved to the applicant and no higher approver exists`,
  };
};

type ICandidate =
  | { ok: true; employeeId: string }
  | { ok: false; reason: LeaveApprovalUnresolvedReason; detail: string };

const candidateFor = (
  nodeKind: LeaveApprovalNodeKind,
  specificEmployeeId: string | null,
  org: IApprovalOrgSnapshot,
  excludeEmployeeId?: string,
): ICandidate => {
  switch (nodeKind) {
    case LeaveApprovalNodeKind.DIRECT_MANAGER:
      return org.directManagerId === null
        ? {
            ok: false,
            reason: LeaveApprovalUnresolvedReason.NO_DIRECT_MANAGER,
            detail: "the applicant has no direct manager on file",
          }
        : { ok: true, employeeId: org.directManagerId };
    case LeaveApprovalNodeKind.DEPARTMENT_MANAGER:
      return org.departmentManagerId === null
        ? {
            ok: false,
            reason: LeaveApprovalUnresolvedReason.NO_DEPARTMENT_MANAGER,
            detail: "no department in the applicant's chain has a manager",
          }
        : { ok: true, employeeId: org.departmentManagerId };
    case LeaveApprovalNodeKind.HR: {
      /**
       * Info: (20260817 - Julian) HR 是「任一人簽核即通過」，快照必須落在一個具體的人 ——
       * 存一個「HR 群組」會讓事後查不出是誰簽的。取排序後的第一位以保決定性
       * （同 FIFO 扣減的第三層排序鍵），實務上由代理機制處理輪值。
       */
      const pool = [...org.hrEmployeeIds]
        .filter((id) => id !== excludeEmployeeId)
        .sort();
      return pool.length === 0
        ? {
            ok: false,
            reason: LeaveApprovalUnresolvedReason.NO_HR,
            detail: "this account book has no HR approver",
          }
        : { ok: true, employeeId: pool[0] };
    }
    case LeaveApprovalNodeKind.SPECIFIC_EMPLOYEE:
      return specificEmployeeId === null
        ? {
            ok: false,
            reason: LeaveApprovalUnresolvedReason.SPECIFIC_EMPLOYEE_MISSING,
            detail: "a SPECIFIC_EMPLOYEE step carries no employee id",
          }
        : { ok: true, employeeId: specificEmployeeId };
    default: {
      // Info: (20260817 - Julian) 窮舉檢查：新增節點型別而漏改這裡時編譯期就會失敗
      const exhaustive: never = nodeKind;
      return {
        ok: false,
        reason: LeaveApprovalUnresolvedReason.EMPTY_RULE_STEPS,
        detail: `unhandled node kind ${String(exhaustive)}`,
      };
    }
  }
};

const identify = (
  nodeKind: LeaveApprovalNodeKind,
  employeeId: string,
  org: IApprovalOrgSnapshot,
  escalatedReason: string | null,
): INodeOutcome => {
  const approver = org.directory[employeeId];
  if (approver === undefined) {
    return {
      ok: false,
      reason: LeaveApprovalUnresolvedReason.SPECIFIC_EMPLOYEE_MISSING,
      detail: `approver ${employeeId} is not in the directory (left the company?)`,
    };
  }
  return { ok: true, nodeKind, approver, escalatedReason };
};

/**
 * Info: (20260817 - Julian) 相鄰去重：直屬主管恰好就是部門經理時不簽兩次。
 *
 * 只去重**相鄰**的，不去重整條鏈：A → B → A 的鏈是刻意的（複核），
 * 而相鄰重複只可能是組織結構造成的巧合。
 */
const dedupeAdjacent = (
  steps: readonly IResolvedApprovalStep[],
): IResolvedApprovalStep[] => {
  const merged: IResolvedApprovalStep[] = [];
  for (const step of steps) {
    const previous = merged[merged.length - 1];
    if (
      previous !== undefined &&
      previous.approver.employeeId === step.approver.employeeId
    ) {
      previous.mergedFromKinds = [
        ...previous.mergedFromKinds,
        previous.nodeKind,
        step.nodeKind,
      ].filter((kind, index, all) => all.indexOf(kind) === index);
      continue;
    }
    merged.push({ ...step, order: merged.length });
  }
  return merged;
};
