import { describe, it, expect } from "@jest/globals";
import { resolveApprovalChain } from "@/lib/leave_approval_chain";
import { LeaveApprovalNodeKind } from "@/constants/leave_policy";
import {
  IApprovalOrgSnapshot,
  IApprovalRuleWithSteps,
  LeaveApprovalUnresolvedReason,
} from "@/interfaces/leave_request";

/**
 * Info: (20260817 - Julian) T8：簽核鏈展開（ADR 023）。
 *
 * 展開的結果是**快照**，因此測試同時驗「工號與姓名有被帶出來」——
 * 少了那兩個欄位，核准者離職後這張單就答不出「當時是誰核的」。
 */

const identity = (id: string, no: string, name: string) => ({
  employeeId: id,
  employeeNo: no,
  name,
  jobTitle: null,
});

const org: IApprovalOrgSnapshot = {
  applicantEmployeeId: "emp-staff",
  directManagerId: "emp-lead",
  departmentManagerId: "emp-dept",
  hrEmployeeIds: ["emp-hr2", "emp-hr1"],
  directory: {
    "emp-staff": identity("emp-staff", "EMP001", "王小明"),
    "emp-lead": identity("emp-lead", "EMP002", "李組長"),
    "emp-dept": identity("emp-dept", "EMP003", "陳經理"),
    "emp-hr1": identity("emp-hr1", "EMP004", "林人資"),
    "emp-hr2": identity("emp-hr2", "EMP005", "黃人資"),
  },
};

// Info: (20260817 - Julian) 需求的兩段式規則：3 天內直屬主管；3 天以上簽至部門經理與 HR
const rules: IApprovalRuleWithSteps[] = [
  {
    leavePolicyId: null,
    minDays: 0,
    maxDays: 3,
    steps: [{ order: 0, nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER, specificEmployeeId: null }],
  },
  {
    leavePolicyId: null,
    minDays: 3,
    maxDays: null,
    steps: [
      { order: 0, nodeKind: LeaveApprovalNodeKind.DIRECT_MANAGER, specificEmployeeId: null },
      { order: 1, nodeKind: LeaveApprovalNodeKind.DEPARTMENT_MANAGER, specificEmployeeId: null },
      { order: 2, nodeKind: LeaveApprovalNodeKind.HR, specificEmployeeId: null },
    ],
  },
];

const resolve = (totalDays: number, overrides: Partial<IApprovalOrgSnapshot> = {}) =>
  resolveApprovalChain({
    leavePolicyId: "policy-annual",
    totalDays,
    rules,
    org: { ...org, ...overrides },
  });

describe("resolveApprovalChain — 規則命中", () => {
  it("短假只走直屬主管", () => {
    const result = resolve(1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].approver.employeeNo).toBe("EMP002");
  });

  it("長假走三關", () => {
    const result = resolve(5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps.map((s) => s.approver.employeeNo)).toEqual([
      "EMP002",
      "EMP003",
      "EMP004",
    ]);
  });

  /**
   * Info: (20260817 - Julian) 需求原文「3 天內…3 天以上…」在 3.0 天處重疊。
   * 本專案定為左閉右開，**恰好 3 天走長假規則** —— 這種邊界不能留給實作者猜。
   */
  it("恰好 3 天走長假規則（左閉右開）", () => {
    const result = resolve(3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps).toHaveLength(3);
  });

  it("2.5 天仍走短假規則", () => {
    const result = resolve(2.5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps).toHaveLength(1);
  });

  /**
   * Info: (20260817 - Julian) 假別專屬規則**完全取代**通則，不混用：
   * 若允許部分退回通則，改了通則之後特休的長假流程會跟著變、短假卻沒變。
   */
  it("假別專屬規則完全取代通則", () => {
    const result = resolveApprovalChain({
      leavePolicyId: "policy-annual",
      totalDays: 10,
      rules: [
        ...rules,
        {
          leavePolicyId: "policy-annual",
          minDays: 0,
          maxDays: null,
          steps: [
            { order: 0, nodeKind: LeaveApprovalNodeKind.HR, specificEmployeeId: null },
          ],
        },
      ],
      org,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].nodeKind).toBe(LeaveApprovalNodeKind.HR);
  });

  it("沒有規則涵蓋這個天數時回報 NO_MATCHING_RULE", () => {
    const result = resolveApprovalChain({
      leavePolicyId: "policy-annual",
      totalDays: 1,
      rules: [{ leavePolicyId: null, minDays: 5, maxDays: null, steps: rules[0].steps }],
      org,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe(LeaveApprovalUnresolvedReason.NO_MATCHING_RULE);
  });
});

describe("resolveApprovalChain — 快照", () => {
  it("帶出解析當下的工號與姓名（核准者離職後仍答得出是誰核的）", () => {
    const result = resolve(1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps[0].approver).toEqual({
      employeeId: "emp-lead",
      employeeNo: "EMP002",
      name: "李組長",
      jobTitle: null,
    });
  });

  it("簽核者不在名冊（已離職）時回報，而不是留下一個空的節點", () => {
    const result = resolve(1, { directManagerId: "emp-ghost" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe(
      LeaveApprovalUnresolvedReason.SPECIFIC_EMPLOYEE_MISSING,
    );
  });
});

describe("resolveApprovalChain — 相鄰去重", () => {
  /**
   * Info: (20260817 - Julian) 小部門裡直屬主管常常就是部門經理。
   * 同一個人不簽兩次，但要記下被併掉的是哪些節點 ——
   * 否則「為什麼這張單只有兩關」看起來像少簽了一關。
   */
  it("直屬主管恰好是部門經理時只簽一次，並記下被併掉的節點", () => {
    const result = resolve(5, { departmentManagerId: "emp-lead" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].mergedFromKinds).toEqual([
      LeaveApprovalNodeKind.DIRECT_MANAGER,
      LeaveApprovalNodeKind.DEPARTMENT_MANAGER,
    ]);
    expect(result.steps.map((s) => s.order)).toEqual([0, 1]);
  });

  it("只去重相鄰的：A → B → A 的複核鏈保留", () => {
    const result = resolveApprovalChain({
      leavePolicyId: "policy-annual",
      totalDays: 1,
      rules: [
        {
          leavePolicyId: null,
          minDays: 0,
          maxDays: null,
          steps: [
            { order: 0, nodeKind: LeaveApprovalNodeKind.SPECIFIC_EMPLOYEE, specificEmployeeId: "emp-lead" },
            { order: 1, nodeKind: LeaveApprovalNodeKind.DEPARTMENT_MANAGER, specificEmployeeId: null },
            { order: 2, nodeKind: LeaveApprovalNodeKind.SPECIFIC_EMPLOYEE, specificEmployeeId: "emp-lead" },
          ],
        },
      ],
      org,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps).toHaveLength(3);
  });
});

describe("resolveApprovalChain — 自我核准的上升", () => {
  /**
   * Info: (20260817 - Julian) 「老闆自己請假」不是錯誤狀態，是每個組織都會發生的常態。
   * 做成錯誤只會逼出一個繞過簽核的後門（ADR 023 §5）。
   */
  it("自己是自己的主管時上升到部門經理，並記下理由", () => {
    const result = resolve(1, { directManagerId: "emp-staff" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps[0].nodeKind).toBe(
      LeaveApprovalNodeKind.DEPARTMENT_MANAGER,
    );
    expect(result.steps[0].approver.employeeNo).toBe("EMP003");
    expect(result.steps[0].escalatedReason).toContain("escalated to");
  });

  it("同時是直屬主管與部門經理時一路上升到 HR", () => {
    const result = resolve(1, {
      directManagerId: "emp-staff",
      departmentManagerId: "emp-staff",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps[0].nodeKind).toBe(LeaveApprovalNodeKind.HR);
  });

  it("HR 自己請假時改由另一位 HR 簽", () => {
    const hrOrg: IApprovalOrgSnapshot = {
      ...org,
      applicantEmployeeId: "emp-hr1",
      directManagerId: null,
      departmentManagerId: null,
    };
    const result = resolveApprovalChain({
      leavePolicyId: "policy-annual",
      totalDays: 1,
      rules: [
        {
          leavePolicyId: null,
          minDays: 0,
          maxDays: null,
          steps: [{ order: 0, nodeKind: LeaveApprovalNodeKind.HR, specificEmployeeId: null }],
        },
      ],
      org: hrOrg,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps[0].approver.employeeId).toBe("emp-hr2");
  });

  it("唯一的 HR 自己請假且無其他人可簽時回報 NO_OTHER_HR", () => {
    const result = resolveApprovalChain({
      leavePolicyId: "policy-annual",
      totalDays: 1,
      rules: [
        {
          leavePolicyId: null,
          minDays: 0,
          maxDays: null,
          steps: [{ order: 0, nodeKind: LeaveApprovalNodeKind.HR, specificEmployeeId: null }],
        },
      ],
      org: {
        ...org,
        applicantEmployeeId: "emp-hr1",
        hrEmployeeIds: ["emp-hr1"],
        directManagerId: null,
        departmentManagerId: null,
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe(LeaveApprovalUnresolvedReason.NO_OTHER_HR);
  });
});

describe("resolveApprovalChain — 展不開時要指出缺什麼", () => {
  /**
   * Info: (20260817 - Julian) 解法在 HR 手上不在員工手上 ——
   * 一句「簽核流程錯誤」會讓員工反覆重送。
   */
  it.each([
    [
      "沒有直屬主管",
      { directManagerId: null },
      LeaveApprovalUnresolvedReason.NO_DIRECT_MANAGER,
    ],
    [
      "部門沒有經理",
      { departmentManagerId: null },
      LeaveApprovalUnresolvedReason.NO_DEPARTMENT_MANAGER,
    ],
    ["帳本沒有 HR", { hrEmployeeIds: [] }, LeaveApprovalUnresolvedReason.NO_HR],
  ])("%s：回報 %s", (_label, overrides, expected) => {
    const result = resolve(5, overrides as Partial<IApprovalOrgSnapshot>);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe(expected);
    expect(result.detail.length).toBeGreaterThan(0);
  });

  it("命中的規則沒有任何節點時擋下，而不是視為自動核准", () => {
    const result = resolveApprovalChain({
      leavePolicyId: "policy-annual",
      totalDays: 1,
      rules: [{ leavePolicyId: null, minDays: 0, maxDays: null, steps: [] }],
      org,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe(LeaveApprovalUnresolvedReason.EMPTY_RULE_STEPS);
  });
});
