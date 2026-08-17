import { describe, it, expect, beforeEach } from "@jest/globals";
import { LeaveApprovalRuleService } from "@/services/leave_approval_rule.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { LeaveApprovalNodeKind } from "@/constants/leave_policy";
import {
  IApprovalRuleScope,
  IApprovalRuleView,
  IStorableApprovalRule,
} from "@/interfaces/leave_approval_rule";
import { ILeaveApprovalRuleRepository } from "@/repositories/leave_approval_rule.repo";
import {
  IApprovalRuleRange,
  assertRuleRangesDisjoint,
} from "@/repositories/leave_approval_rule_invariant";

/**
 * Info: (20260817 - Julian) 簽核規則設定（L31 / L32）。
 *
 * ## 為什麼這支測試存在
 *
 * `LeaveApprovalRule` 在此之前**沒有任何寫入端**，而請假單那六支 route
 * 早就寫好了 —— 結果是每一張假單都以 `NO_MATCHING_RULE` 失敗。
 * 那個缺口沒有被任何測試看見，因為「表存在、讀得到、引擎會用它」
 * 三件事都成立，只是沒有人寫得進去。
 *
 * 因此這裡除了驗擋下的條件，也**驗一次 seed 用的那組規則**：
 * 它是整個 demo 能不能演的前提。
 */

const ACCOUNT_BOOK_ID = "book-1";
const ACTOR = "emp-005";

class FakeRuleRepo implements ILeaveApprovalRuleRepository {
  public stored: IApprovalRuleView[] = [];

  public lastScope: IApprovalRuleScope | null = null;

  async listByAccountBook(): Promise<IApprovalRuleView[]> {
    return this.stored;
  }

  /**
   * Info: (20260817 - Julian) 假 repository 也跑一次真的不變式。
   *
   * 不跑的話，service 的錯誤轉譯分支（把不變式訊息原文帶出去）
   * 永遠不會被執行到 —— 而那正是使用者唯一看得到的東西。
   */
  async replaceScope(params: {
    accountBookId: string;
    scope: IApprovalRuleScope;
    rules: readonly IStorableApprovalRule[];
  }): Promise<IApprovalRuleView[]> {
    assertRuleRangesDisjoint(
      params.rules.map(
        (rule): IApprovalRuleRange => ({
          minDays: rule.minDays,
          maxDays: rule.maxDays,
        }),
      ),
    );
    this.lastScope = params.scope;
    this.stored = params.rules.map((rule, index) => ({
      id: `rule-${index + 1}`,
      leavePolicyId: params.scope.leavePolicyId,
      minDays: rule.minDays,
      maxDays: rule.maxDays,
      steps: rule.steps.map((step, order) => ({
        order: order + 1,
        nodeKind: step.nodeKind,
        specificEmployeeId: step.specificEmployeeId ?? null,
      })),
    }));
    return this.stored;
  }
}

const manager = { nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER };
const deptManager = { nodeKind: LeaveApprovalNodeKind.DEPARTMENT_MANAGER };

/** Info: (20260817 - Julian) seed 用的那一組：需求原文「3 天內一關、3 天以上兩關」 */
const SEED_RULES: IStorableApprovalRule[] = [
  { minDays: 0, maxDays: 3, steps: [manager] },
  { minDays: 3, maxDays: null, steps: [manager, deptManager] },
];

let repo: FakeRuleRepo;
let service: LeaveApprovalRuleService;

const replace = (
  rules: IStorableApprovalRule[],
  leavePolicyId: string | null = null,
) =>
  service.replaceScope({
    accountBookId: ACCOUNT_BOOK_ID,
    actorEmployeeId: ACTOR,
    leavePolicyId,
    rules,
  });

beforeEach(() => {
  repo = new FakeRuleRepo();
  service = new LeaveApprovalRuleService(repo);
});

describe("L32 — 整組取代", () => {
  it("seed 用的那組規則通過", async () => {
    await expect(replace(SEED_RULES)).resolves.toBeDefined();
    expect(repo.stored).toHaveLength(2);
  });

  it("order 由陣列位置決定，不採信呼叫端", async () => {
    await replace(SEED_RULES);
    expect(repo.stored[1].steps.map((step) => step.order)).toEqual([1, 2]);
  });

  it("取代範圍限定在傳入的 scope", async () => {
    await replace(SEED_RULES, "policy-annual");
    expect(repo.lastScope).toEqual({ leavePolicyId: "policy-annual" });
  });

  it("假別專屬規則可以清空：語意是退回走通則", async () => {
    await expect(replace([], "policy-annual")).resolves.toBeDefined();
  });

  /**
   * Info: (20260817 - Julian) 通則清空的效果是「這個帳本從此沒有假單送得出去」，
   * 而它要到有人請假時才顯現 —— 屆時錯誤訊息會指向人事資料。
   */
  it("通則不可清空", async () => {
    await expect(replace([])).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_LEAVE_GENERAL_RULE_REQUIRED.code,
    });
  });
});

describe("L32 — 集合層級的不變式會被轉譯出去", () => {
  it.each([
    [
      "區間有洞",
      [
        { minDays: 0, maxDays: 3, steps: [manager] },
        { minDays: 5, maxDays: null, steps: [manager] },
      ],
    ],
    [
      "區間重疊",
      [
        { minDays: 0, maxDays: 5, steps: [manager] },
        { minDays: 3, maxDays: null, steps: [manager] },
      ],
    ],
    ["不是從 0 起算", [{ minDays: 1, maxDays: null, steps: [manager] }]],
    [
      "最後一條有上界（最長的假反而不用簽核）",
      [{ minDays: 0, maxDays: 30, steps: [manager] }],
    ],
  ] as [string, IStorableApprovalRule[]][])(
    "%s 時擋下",
    async (_name, rules) => {
      await expect(replace(rules)).rejects.toMatchObject({
        apiCode: API_ERRORS.VA_LEAVE_APPROVAL_RULE_INVALID.code,
      });
    },
  );

  /**
   * Info: (20260817 - Julian) 訊息必須帶得出**哪一種**不合法。
   *
   * 「有洞」與「最後一條有上界」是兩個不同的修法，共用一句泛用訊息
   * 等於只告訴使用者「存不進去」，而他會開始亂試。
   */
  it("錯誤訊息帶出不變式的原文而不是一句泛用的話", async () => {
    try {
      await replace([
        { minDays: 0, maxDays: 3, steps: [manager] },
        { minDays: 5, maxDays: null, steps: [manager] },
      ]);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as Error).message).toContain("gap");
    }
  });
});

describe("L32 — 節點層級的一致性", () => {
  it("空的簽核鏈擋下：它在送出時是硬錯誤，設定時就該擋", async () => {
    await expect(
      replace([{ minDays: 0, maxDays: null, steps: [] }]),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_LEAVE_APPROVAL_RULE_INVALID.code,
    });
  });

  it("指名節點必須有指名對象", async () => {
    await expect(
      replace([
        {
          minDays: 0,
          maxDays: null,
          steps: [{ nodeKind: LeaveApprovalNodeKind.SPECIFIC_EMPLOYEE }],
        },
      ]),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_LEAVE_APPROVAL_RULE_INVALID.code,
    });
  });

  /**
   * Info: (20260817 - Julian) 反方向同樣擋：非指名節點帶著一個員工 id，
   * 在設定畫面上看起來就是「這一關由某某簽」，而引擎完全不讀它。
   */
  it("非指名節點不得帶著指名對象", async () => {
    await expect(
      replace([
        {
          minDays: 0,
          maxDays: null,
          steps: [
            {
              nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER,
              specificEmployeeId: "emp-001",
            },
          ],
        },
      ]),
    ).rejects.toMatchObject({
      apiCode: API_ERRORS.VA_LEAVE_APPROVAL_RULE_INVALID.code,
    });
  });

  it("指名節點帶著對象時通過", async () => {
    await expect(
      replace([
        {
          minDays: 0,
          maxDays: null,
          steps: [
            {
              nodeKind: LeaveApprovalNodeKind.SPECIFIC_EMPLOYEE,
              specificEmployeeId: "emp-001",
            },
          ],
        },
      ]),
    ).resolves.toBeDefined();
  });
});

describe("L31 — 依 scope 分組", () => {
  it("通則與假別專屬分開回傳，前端不必自己 groupBy", async () => {
    repo.stored = [
      {
        id: "r1",
        leavePolicyId: null,
        minDays: 0,
        maxDays: null,
        steps: [{ order: 1, ...manager, specificEmployeeId: null }],
      },
      {
        id: "r2",
        leavePolicyId: "policy-annual",
        minDays: 0,
        maxDays: null,
        steps: [{ order: 1, ...manager, specificEmployeeId: null }],
      },
    ];

    const view = await service.list(ACCOUNT_BOOK_ID);

    expect(view.general).toHaveLength(1);
    expect(view.byPolicy["policy-annual"]).toHaveLength(1);
  });

  // Info: (20260817 - Julian) 空的通則要看得出來——那代表所有假單都送不出去
  it("尚未設定時通則是空陣列而不是 undefined", async () => {
    const view = await service.list(ACCOUNT_BOOK_ID);
    expect(view.general).toEqual([]);
    expect(view.byPolicy).toEqual({});
  });
});
