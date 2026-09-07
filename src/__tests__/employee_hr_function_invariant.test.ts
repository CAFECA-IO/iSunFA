import { describe, it, expect } from "@jest/globals";
import { EmployeeHrFunction } from "@/constants/hr_management";
import {
  activeHrFunctionKeyOf,
  assertStorableHrFunctionAssignment,
  EmployeeHrFunctionInvariantError,
  IStorableHrFunctionAssignment,
} from "@/repositories/employee_hr_function_invariant";

/**
 * Info: (20260818 - Julian) HR 職能指派的生效狀態不變式。
 *
 * ## 為什麼這幾條值得一支測試
 *
 * 選擇用指派表而不是 `Employee` 上的 enum 陣列，**唯一的理由**是要答得出
 * 「四月那張單被簽核時，誰有 HR 權限」。那個答案完全建立在三組欄位
 * （`revokedAt` / `revokedBy*` / `activeKey`）彼此同步之上 ——
 * 一旦它們可以各說各話，這張表就退化成一個比 enum 陣列更貴、更難讀的欄位。
 *
 * 最危險的組合是「已撤銷但 `activeKey` 還在」：那個人在紀錄上沒有職能，
 * 卻仍會被 `listHolderIds()` 撈出來排進簽核鏈。症狀是一張看起來正常的假單，
 * 由一個當時已經不是人資的人簽核 —— 而畫面上看不出任何異狀。
 */

const ACTIVE: IStorableHrFunctionAssignment = {
  employeeId: "emp-1",
  function: EmployeeHrFunction.HR_ADMIN,
  grantedByEmployeeNo: "EMP001",
  grantedByName: "王小明",
  revokedAt: null,
  revokedByEmployeeNo: null,
  revokedByName: null,
  activeKey: activeHrFunctionKeyOf("emp-1", EmployeeHrFunction.HR_ADMIN),
};

const REVOKED: IStorableHrFunctionAssignment = {
  ...ACTIVE,
  revokedAt: new Date("2026-04-01T00:00:00.000Z"),
  revokedByEmployeeNo: "EMP002",
  revokedByName: "李小華",
  activeKey: null,
};

describe("activeHrFunctionKeyOf", () => {
  // Info: (20260818 - Julian) 組法只有這一處定義；兩處各組一次遲早分岔
  it("以 employeeId 與職能組成", () => {
    expect(activeHrFunctionKeyOf("emp-1", EmployeeHrFunction.HR_ADMIN)).toBe(
      "emp-1:HR_ADMIN",
    );
  });

  it("同一人的不同職能不會相撞", () => {
    expect(
      activeHrFunctionKeyOf("emp-1", EmployeeHrFunction.HR_ADMIN),
    ).not.toBe(activeHrFunctionKeyOf("emp-1", EmployeeHrFunction.TIMEKEEPER));
  });
});

describe("HR 職能指派的生效狀態", () => {
  it("生效中的一列通過", () => {
    expect(() => assertStorableHrFunctionAssignment(ACTIVE)).not.toThrow();
  });

  it("已撤銷的一列通過", () => {
    expect(() => assertStorableHrFunctionAssignment(REVOKED)).not.toThrow();
  });

  /**
   * Info: (20260818 - Julian) 這一條是整支測試的重點：已撤銷卻留著 `activeKey`
   * 的那一列會被 `listHolderIds()` 撈出來，而它在紀錄上已經沒有職能。
   */
  it("已撤銷卻留著 activeKey：擋下", () => {
    expect(() =>
      assertStorableHrFunctionAssignment({
        ...REVOKED,
        activeKey: ACTIVE.activeKey,
      }),
    ).toThrow(EmployeeHrFunctionInvariantError);
  });

  it("生效中卻沒有 activeKey：擋下（它會變成查不到的孤兒）", () => {
    expect(() =>
      assertStorableHrFunctionAssignment({ ...ACTIVE, activeKey: null }),
    ).toThrow(EmployeeHrFunctionInvariantError);
  });

  // Info: (20260818 - Julian) 鍵組錯（例如抄了別人的 employeeId）同樣擋下
  it("activeKey 與 employeeId / 職能對不上：擋下", () => {
    expect(() =>
      assertStorableHrFunctionAssignment({
        ...ACTIVE,
        activeKey: activeHrFunctionKeyOf("emp-2", EmployeeHrFunction.HR_ADMIN),
      }),
    ).toThrow(EmployeeHrFunctionInvariantError);
  });

  it("撤銷了卻不知道是誰撤的：擋下", () => {
    expect(() =>
      assertStorableHrFunctionAssignment({
        ...REVOKED,
        revokedByEmployeeNo: null,
        revokedByName: null,
      }),
    ).toThrow(EmployeeHrFunctionInvariantError);
  });

  it("有撤銷者卻沒有撤銷時點：擋下", () => {
    expect(() =>
      assertStorableHrFunctionAssignment({
        ...ACTIVE,
        revokedByEmployeeNo: "EMP002",
        revokedByName: "李小華",
      }),
    ).toThrow(EmployeeHrFunctionInvariantError);
  });

  /**
   * Info: (20260818 - Julian) 指派者的外鍵是 `SetNull`（他離職就會斷），
   * 所以這兩個字串是「誰給的」的唯一長期來源。空字串等於一筆沒有人指派過的權限
   * —— 正是 ADR 023 §1 第 2 點那個失敗模式。
   */
  it.each([
    ["工號", { grantedByEmployeeNo: "  " }],
    ["姓名", { grantedByName: "" }],
  ])("指派者的%s是空的：擋下", (_label, override) => {
    expect(() =>
      assertStorableHrFunctionAssignment({ ...ACTIVE, ...override }),
    ).toThrow(EmployeeHrFunctionInvariantError);
  });
});
