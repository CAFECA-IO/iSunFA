import { describe, it, expect, beforeEach } from "@jest/globals";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { EmployeeHrFunction } from "@/constants/hr_management";
import {
  assertMayViewOvertimeOf,
  IOvertimeVisibilityDeps,
} from "@/services/overtime_visibility";

/**
 * Info: (20260819 - Julian) 加班的可見範圍 —— **這支先前不存在**（review B9）。
 *
 * ## 它守著什麼
 *
 * `assertMayViewOvertimeOf` 是 L28（月統計）、L29（未核准時段）與加班單清單
 * 三支端點的**唯一**授權點。三種人看得到：本人、管得到他的主管、
 * 具 `HR_ADMIN` 職能者。任何一條放寬都會讓「誰在加班」變成一份
 * 全公司都查得到的資料。
 *
 * ## 為什麼先前測不了
 *
 * 它直接呼叫兩個模組層單例，因此要測就得 `jest.mock` 整個 repository 模組
 * —— 而 `next/jest`(SWC) 下具名 import 的 `jest.mock` 工廠不會被提升，
 * 那條路本身就是一個已知的坑。改成參數注入（預設值仍綁單例，
 * 12 個既有呼叫端一行都不必改）之後，這裡傳兩個假的進去就好。
 *
 * ## 為什麼每一條都要驗「有沒有去問」
 *
 * 只驗結果的話，一個「無論如何都放行」的實作會通過三條裡的兩條。
 * 下面同時記錄呼叫次數 —— 本人不必去問任何人（省一次 DB 往返是次要的，
 * 主要是它證明了短路真的在最前面），而被擋下的人必須兩個問題都問過。
 */

const BOOK = "book-1";
const ACTOR = "emp-005";
const TARGET = "emp-006";

class FakeDeps implements IOvertimeVisibilityDeps {
  public manages = false;

  public isHr = false;

  public managesCalls = 0;

  public hrCalls = 0;

  public lastHrFunctions: readonly EmployeeHrFunction[] = [];

  async managesEmployee(): Promise<boolean> {
    this.managesCalls += 1;
    return this.manages;
  }

  async hasAnyFunction(params: {
    hrFunctions: readonly EmployeeHrFunction[];
  }): Promise<boolean> {
    this.hrCalls += 1;
    this.lastHrFunctions = params.hrFunctions;
    return this.isHr;
  }
}

let deps: FakeDeps;

beforeEach(() => {
  deps = new FakeDeps();
});

const assertFor = (actorEmployeeId: string, targetEmployeeId: string) =>
  assertMayViewOvertimeOf(
    { accountBookId: BOOK, actorEmployeeId, targetEmployeeId },
    deps,
  );

describe("三種人看得到", () => {
  it("本人：直接放行，不必去問任何人", async () => {
    await expect(assertFor(ACTOR, ACTOR)).resolves.toBeUndefined();
    expect(deps.managesCalls).toBe(0);
    expect(deps.hrCalls).toBe(0);
  });

  /**
   * Info: (20260819 - Julian) 判準是 `managesEmployee()`（部門子樹）而不是
   * `isDepartmentManager()`。拿後者當授權，第一工務段的主管就看得到
   * 第五工務段的人（接線守則 §3.5.3）。
   */
  it("管得到他的主管：放行，且不必再問 HR 職能", async () => {
    deps.manages = true;
    await expect(assertFor(ACTOR, TARGET)).resolves.toBeUndefined();
    expect(deps.managesCalls).toBe(1);
    expect(deps.hrCalls).toBe(0);
  });

  it("具 HR_ADMIN 職能者：放行", async () => {
    deps.manages = false;
    deps.isHr = true;
    await expect(assertFor(ACTOR, TARGET)).resolves.toBeUndefined();
    expect(deps.hrCalls).toBe(1);
    expect(deps.lastHrFunctions).toEqual([EmployeeHrFunction.HR_ADMIN]);
  });

  /**
   * Info: (20260819 - Julian) `TIMEKEEPER` 不在名單上。
   *
   * 這一條看起來像在測一個沒寫的分支，但它守的是**問題本身**：
   * 若哪天有人把 `hrFunctions` 擴成 `[HR_ADMIN, TIMEKEEPER]`，
   * 出勤登錄員就順帶看得到全公司的加班了。
   */
  it("只問 HR_ADMIN，不含 TIMEKEEPER", async () => {
    deps.isHr = false;
    await expect(assertFor(ACTOR, TARGET)).rejects.toThrow(AppError);
    expect(deps.lastHrFunctions).not.toContain(EmployeeHrFunction.TIMEKEEPER);
  });
});

describe("其餘的人一律擋下", () => {
  /**
   * Info: (20260819 - Julian) 回 403 而不是空陣列。
   *
   * 空陣列是對**資料**的陳述（「他沒有加班過」），被擋是對**請求**的陳述。
   * 兩者混在一起，會讓一個沒有權限的人以為那個人真的沒加過班。
   */
  it("既非主管也非 HR：丟 FO_NO_PERMISSION_TO_VIEW_THIS", async () => {
    let code: string | null = null;
    try {
      await assertFor(ACTOR, TARGET);
    } catch (error) {
      if (error instanceof AppError) code = error.apiCode;
    }
    expect(code).toBe(API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS.code);
  });

  it("被擋下之前，兩個問題都問過了（不是提早短路）", async () => {
    await expect(assertFor(ACTOR, TARGET)).rejects.toThrow(AppError);
    expect(deps.managesCalls).toBe(1);
    expect(deps.hrCalls).toBe(1);
  });

  /**
   * Info: (20260819 - Julian) 帳本與對象要原樣傳下去。
   *
   * 傳錯帳本的話，跨帳本的「管得到」會被誤判成成立 —— 那是一個
   * 只有在多帳本環境才現形、且看起來像資料錯誤的授權漏洞。
   */
  it("帳本、決行者、對象三個參數都原樣傳給 managesEmployee", async () => {
    const seen: unknown[] = [];
    const spyDeps: IOvertimeVisibilityDeps = {
      managesEmployee: async (params) => {
        seen.push(params);
        return false;
      },
      hasAnyFunction: async () => true,
    };
    await assertMayViewOvertimeOf(
      { accountBookId: BOOK, actorEmployeeId: ACTOR, targetEmployeeId: TARGET },
      spyDeps,
    );
    expect(seen).toEqual([
      {
        accountBookId: BOOK,
        managerEmployeeId: ACTOR,
        targetEmployeeId: TARGET,
      },
    ]);
  });
});
