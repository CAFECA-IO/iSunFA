import { Prisma } from "@/generated";
import { prisma } from "@/lib/prisma";
import { LeaveApprovalNodeKind } from "@/constants/leave_policy";
import {
  IApprovalRuleRange,
  assertRuleRangesDisjoint,
} from "@/repositories/leave_approval_rule_invariant";
import {
  IApprovalRuleScope,
  IApprovalRuleView,
  IStorableApprovalRule,
} from "@/interfaces/leave_approval_rule";

/**
 * Info: (20260817 - Julian) 簽核規則的寫入端。
 *
 * ## 為什麼是「整組取代」而不是逐條 CRUD
 *
 * 規則的正確性是**集合層級**的：`assertRuleRangesDisjoint` 要求
 * 排序後自 0 起、首尾相接、最後一條無上界。逐條新增／修改都無法在
 * 當下判斷結果合不合法 —— 使用者刪掉中間一條，剩下的每一條都還是
 * 「合法的一條規則」，而整組已經有洞了。
 *
 * 那個洞的症狀是：某個天數區間的假單展開成空鏈，錯誤訊息指向
 * 「您尚未設定直屬主管」，使用者跑去改人事資料，改到對為止都不會有效
 * （不變式檔頭的第一段）。
 *
 * 所以這一層只提供「讀出整組」與「換掉整組」，同 L6 年資級距表的處置。
 *
 * ## Scope 的界線
 *
 * 一個 scope = 帳本 × 假別（`leavePolicyId = null` 即通則）。
 * 取代的範圍**只限那一個 scope** —— 換掉特休的規則不該動到通則，
 * 而把兩者混在同一次取代裡，會讓「我只是想改特休」變成一次全面覆寫。
 */

const RULE_SELECT = {
  id: true,
  leavePolicyId: true,
  minDays: true,
  maxDays: true,
  steps: {
    select: { order: true, nodeKind: true, specificEmployeeId: true },
    orderBy: { order: "asc" as const },
  },
} as const;

type RuleRow = Prisma.LeaveApprovalRuleGetPayload<{
  select: typeof RULE_SELECT;
}>;

/**
 * Info: (20260817 - Julian) Decimal → number。
 *
 * 天數是門檻值，只參與比較不參與金額運算，因此不適用 CLAUDE.md §2 的
 * `Prisma.Decimal` 規則（同 `findApprovalRules` 的處置）。反向落地時
 * 一律轉成字串，由邊界防護擋住浮點入庫。
 */
const toView = (row: RuleRow): IApprovalRuleView => ({
  id: row.id,
  leavePolicyId: row.leavePolicyId,
  minDays: Number(row.minDays),
  maxDays: row.maxDays === null ? null : Number(row.maxDays),
  steps: row.steps.map((step) => ({
    order: step.order,
    nodeKind: step.nodeKind as LeaveApprovalNodeKind,
    specificEmployeeId: step.specificEmployeeId,
  })),
});

export interface ILeaveApprovalRuleRepository {
  listByAccountBook(accountBookId: string): Promise<IApprovalRuleView[]>;
  replaceScope(params: {
    accountBookId: string;
    scope: IApprovalRuleScope;
    rules: readonly IStorableApprovalRule[];
  }): Promise<IApprovalRuleView[]>;
}

class LeaveApprovalRuleRepository implements ILeaveApprovalRuleRepository {
  public async listByAccountBook(
    accountBookId: string,
  ): Promise<IApprovalRuleView[]> {
    const rows = await prisma.leaveApprovalRule.findMany({
      where: { accountBookId },
      select: RULE_SELECT,
      orderBy: [{ leavePolicyId: "asc" }, { minDays: "asc" }],
    });
    return rows.map(toView);
  }

  /**
   * Info: (20260817 - Julian) 換掉一個 scope 的整組規則。
   *
   * 刪除與重建在**同一個交易**內：中途失敗若留下「舊的刪了、新的沒進去」，
   * 那個帳本的該假別會變成完全沒有規則 —— 而沒有規則不會報錯，
   * 它會讓每一張假單都以 `NO_MATCHING_RULE` 被拒，
   * 而使用者以為自己只是儲存失敗、重試一次就好。
   *
   * 這是 `attendance_demo_plan.md` §7.4 那條 unit-of-work 例外的第三次援引 ——
   * 依接線守則 §6.1，第三次應先把條文寫進 `coding_guidelines.md`。
   * ToDo: (20260817 - Julian) 條文尚未成文，此處先記錄援引事實。
   */
  public async replaceScope(params: {
    accountBookId: string;
    scope: IApprovalRuleScope;
    rules: readonly IStorableApprovalRule[];
  }): Promise<IApprovalRuleView[]> {
    const { accountBookId, scope, rules } = params;

    /**
     * Info: (20260817 - Julian) 不變式在交易之外先跑：它是純計算，
     * 沒有理由佔用交易時間，而且失敗時我們希望**什麼都還沒刪**。
     */
    assertRuleRangesDisjoint(
      rules.map(
        (rule): IApprovalRuleRange => ({
          minDays: rule.minDays,
          maxDays: rule.maxDays,
        }),
      ),
    );

    await prisma.$transaction(async (tx) => {
      // Info: (20260817 - Julian) steps 掛 Cascade，會跟著走
      await tx.leaveApprovalRule.deleteMany({
        where: { accountBookId, leavePolicyId: scope.leavePolicyId },
      });

      for (const rule of rules) {
        await tx.leaveApprovalRule.create({
          data: {
            accountBookId,
            leavePolicyId: scope.leavePolicyId,
            // Info: (20260817 - Julian) Decimal 以字串落地（邊界防護，CLAUDE.md §2）
            minDays: String(rule.minDays),
            maxDays: rule.maxDays === null ? null : String(rule.maxDays),
            steps: {
              create: rule.steps.map((step, index) => ({
                // Info: (20260817 - Julian) order 由陣列位置決定，不採信呼叫端傳來的值：
                // Info: (20260817 - Julian) 兩個 order 相同會撞 @@unique，而那個錯誤讀起來與順序無關
                order: index + 1,
                nodeKind: step.nodeKind,
                specificEmployeeId: step.specificEmployeeId ?? null,
              })),
            },
          },
        });
      }
    });

    return this.listByAccountBook(accountBookId);
  }
}

export const leaveApprovalRuleRepo: ILeaveApprovalRuleRepository =
  new LeaveApprovalRuleRepository();
