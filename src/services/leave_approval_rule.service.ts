import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { LeaveApprovalNodeKind } from "@/constants/leave_policy";
import {
  IApprovalRuleListView,
  IApprovalRuleView,
  IStorableApprovalRule,
} from "@/interfaces/leave_approval_rule";
import {
  ILeaveApprovalRuleRepository,
  leaveApprovalRuleRepo,
} from "@/repositories/leave_approval_rule.repo";
import { LeaveApprovalRuleInvariantError } from "@/repositories/leave_approval_rule_invariant";

/**
 * Info: (20260817 - Julian) 簽核規則設定（L31 / L32）。
 *
 * ## 這支 service 存在的理由
 *
 * 在它出現之前，`LeaveApprovalRule` **沒有任何寫入端** —— 沒有 repository
 * 方法、沒有 API、seed 也不建。結果是送出任何一張假單都以
 * `NO_MATCHING_RULE` 失敗，而請假單那六支 route 早就寫好了。
 * 「端點齊了」與「跑得起來」是兩件事，這是其中的差距。
 *
 * ## 計畫書 §10 沒有這兩支端點
 *
 * L1–L30 涵蓋了假別、額度、假單、行事曆、併休、統計、折現、加班，
 * **獨漏簽核規則設定** —— 而多級簽核是需求的第二條。
 * 缺口記於計畫書 §17，端點編為 L31 / L32 而不是重排既有編號。
 */
export class LeaveApprovalRuleService {
  public constructor(private readonly rules: ILeaveApprovalRuleRepository) {}

  /**
   * Info: (20260817 - Julian) 誰可以改簽核規則 —— **目前只驗身分**。
   *
   * ⚠️ 這是一個已知缺口的單一插入點，不是一個決定。帳本層級的 HR 角色
   * 尚無來源（`Employee` 上沒有角色欄位，`HrDashboardRole` 只是畫面上的
   * 切換器），見假勤接線守則 §3.5.1 與 ADR 023 §8.3。
   *
   * 沿用既有設定端點的作法（排班、班別、地點目前也只驗身分），
   * 但**集中在這一個方法裡** —— 角色模型補上時只有這裡要改，
   * 而不是散在每一支 route 的開頭。
   *
   * ToDo: (20260817 - Julian) 甲-1 完成後改為檢查 HR 職能。
   */
  private assertMayConfigure(actorEmployeeId: string): void {
    if (!actorEmployeeId) {
      throw new AppError(API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS);
    }
  }

  // Info: (20260817 - Julian) L31：讀出整個帳本的規則，依 scope 分組
  public async list(accountBookId: string): Promise<IApprovalRuleListView> {
    const rules = await this.rules.listByAccountBook(accountBookId);

    const general: IApprovalRuleView[] = [];
    const byPolicy: Record<string, IApprovalRuleView[]> = {};

    for (const rule of rules) {
      if (rule.leavePolicyId === null) {
        general.push(rule);
        continue;
      }
      (byPolicy[rule.leavePolicyId] ??= []).push(rule);
    }

    return { general, byPolicy };
  }

  /**
   * Info: (20260817 - Julian) L32：整組取代某個 scope 的規則。
   *
   * 空陣列的語意依 scope 而不同，這裡刻意分開處理：
   *
   * - **假別專屬** 傳空陣列 = 刪除專屬規則、退回走通則。合法。
   * - **通則** 傳空陣列 = 這個帳本從此沒有任何假單送得出去。
   *   擋下來 —— 那不是一個設定，那是一個沒有人想要的結果，
   *   而它要到有人請假時才會顯現（同 ADR 023 §3 拒絕空鏈的理由）。
   */
  public async replaceScope(params: {
    accountBookId: string;
    actorEmployeeId: string;
    leavePolicyId: string | null;
    rules: readonly IStorableApprovalRule[];
  }): Promise<IApprovalRuleListView> {
    this.assertMayConfigure(params.actorEmployeeId);

    if (params.leavePolicyId === null && params.rules.length === 0) {
      throw new AppError(API_ERRORS.VA_LEAVE_GENERAL_RULE_REQUIRED);
    }

    this.assertStepsWellFormed(params.rules);

    try {
      await this.rules.replaceScope({
        accountBookId: params.accountBookId,
        scope: { leavePolicyId: params.leavePolicyId },
        rules: params.rules,
      });
    } catch (error) {
      /**
       * Info: (20260817 - Julian) 不變式的錯誤要原文帶出去。
       *
       * 「區間有洞 `[3, 5)`」與「最後一條不得有上界」是兩個不同的修法，
       * 而包成一個泛用的 `VA_INVALID_INPUT_DATA` 會讓使用者只知道
       * 「存不進去」。detail 進 log，訊息進回應。
       */
      if (error instanceof LeaveApprovalRuleInvariantError) {
        logger.warn(
          `[leave] approval rule rejected: ${error.reason} (${error.message})`,
        );
        throw new AppError({
          ...API_ERRORS.VA_LEAVE_APPROVAL_RULE_INVALID,
          message: error.message,
        });
      }
      throw error;
    }

    logger.info(
      `[leave] approval rules replaced: book=${params.accountBookId} policy=${params.leavePolicyId ?? "GENERAL"} count=${params.rules.length}`,
    );
    return this.list(params.accountBookId);
  }

  /**
   * Info: (20260817 - Julian) 節點層級的一致性。
   *
   * 這裡擋的是「這些欄位放在一起說不說得通」，Zod 擋不到 ——
   * 它只知道 `specificEmployeeId` 是不是字串。
   */
  private assertStepsWellFormed(rules: readonly IStorableApprovalRule[]): void {
    for (const rule of rules) {
      // Info: (20260817 - Julian) 空鏈在送出時是硬錯誤，設定時就擋住比較誠實
      if (rule.steps.length === 0) {
        throw new AppError(API_ERRORS.VA_LEAVE_APPROVAL_RULE_INVALID);
      }

      for (const step of rule.steps) {
        const isSpecific =
          step.nodeKind === LeaveApprovalNodeKind.SPECIFIC_EMPLOYEE;
        const hasEmployee = Boolean(step.specificEmployeeId);

        /**
         * Info: (20260817 - Julian) 雙向都擋，理由同 `minimumUnitMinutes`：
         * 指名節點沒有指名對象，展開時會變成一個沒有簽核者的關卡；
         * 而非指名節點帶著一個員工 id，在設定畫面上看起來就是
         * 「這一關由某某簽」，實際上引擎完全不讀它。
         */
        if (isSpecific !== hasEmployee) {
          throw new AppError(API_ERRORS.VA_LEAVE_APPROVAL_RULE_INVALID);
        }
      }
    }
  }
}

export const leaveApprovalRuleService = new LeaveApprovalRuleService(
  leaveApprovalRuleRepo,
);
