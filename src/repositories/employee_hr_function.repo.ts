import { prisma } from "@/lib/prisma";
import { EmployeeHrFunction } from "@/constants/hr_management";
import {
  activeHrFunctionKeyOf,
  assertStorableHrFunctionAssignment,
} from "@/repositories/employee_hr_function_invariant";

/**
 * Info: (20260818 - Julian) HR 職能的指派與查詢（甲-1）。
 *
 * ## 查詢一律只看生效中的那些
 *
 * `revokedAt: null` 是每一支查詢的條件。撤銷不刪列（那段期間的權限狀態是
 * 稽核要問的東西），但**已撤銷的人絕不能被排進簽核鏈** ——
 * 兩個需求同時成立的唯一寫法就是「留著列、查詢時濾掉」。
 *
 * ## 為什麼沒有 `assign` 的 service
 *
 * 誰有權指派尚未決定（見 schema 上該 model 的 ToDo）：不能讓 `HR_ADMIN`
 * 指派 `HR_ADMIN`（自我擴權），也不能空著（第一個人永遠拿不到職能）。
 * 在那之前 `grant()` / `revoke()` 只給 seed 與資料遷移用，沒有 API 端點。
 * **這是刻意的**：一個沒有授權判斷的指派端點，比沒有端點危險得多。
 */
export interface IEmployeeHrFunctionRepository {
  /** Info: (20260818 - Julian) 帳本內具備該職能且仍生效的員工 id，排序後回傳以保決定性 */
  listHolderIds(params: {
    accountBookId: string;
    hrFunction: EmployeeHrFunction;
  }): Promise<string[]>;

  /** Info: (20260818 - Julian) 這個人仍生效的所有職能（顯示用；授權請用 `hasAnyFunction`） */
  listFunctionsOf(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<EmployeeHrFunction[]>;

  /** Info: (20260818 - Julian) 這個人是否具備清單中的**任一**職能（授權判斷用） */
  hasAnyFunction(params: {
    accountBookId: string;
    employeeId: string;
    hrFunctions: readonly EmployeeHrFunction[];
  }): Promise<boolean>;

  grant(params: {
    accountBookId: string;
    employeeId: string;
    hrFunction: EmployeeHrFunction;
    grantedByEmployeeId: string | null;
    grantedByEmployeeNo: string;
    grantedByName: string;
    grantReason?: string | null;
  }): Promise<void>;

  /** Info: (20260818 - Julian) 回傳是否真的撤銷了一列；false 代表本來就沒有生效中的指派 */
  revoke(params: {
    accountBookId: string;
    employeeId: string;
    hrFunction: EmployeeHrFunction;
    revokedByEmployeeId: string | null;
    revokedByEmployeeNo: string;
    revokedByName: string;
    revokedAt: Date;
    revokeReason?: string | null;
  }): Promise<boolean>;
}

class EmployeeHrFunctionRepository implements IEmployeeHrFunctionRepository {
  public async listHolderIds(params: {
    accountBookId: string;
    hrFunction: EmployeeHrFunction;
  }): Promise<string[]> {
    const rows = await prisma.employeeHrFunctionAssignment.findMany({
      where: {
        accountBookId: params.accountBookId,
        function: params.hrFunction,
        revokedAt: null,
      },
      select: { employeeId: true },
      orderBy: { employeeId: "asc" },
    });

    // Info: (20260818 - Julian) 去重：同一人同一職能被 activeKey 擋住了，但跨職能查詢時仍可能重複
    return [...new Set(rows.map((row) => row.employeeId))];
  }

  public async listFunctionsOf(params: {
    accountBookId: string;
    employeeId: string;
  }): Promise<EmployeeHrFunction[]> {
    const rows = await prisma.employeeHrFunctionAssignment.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        revokedAt: null,
      },
      select: { function: true },
      // Info: (20260818 - Julian) 排序後回傳以保決定性（同 `listHolderIds`）
      orderBy: { function: "asc" },
    });

    return [...new Set(rows.map((row) => row.function as EmployeeHrFunction))];
  }

  public async hasAnyFunction(params: {
    accountBookId: string;
    employeeId: string;
    hrFunctions: readonly EmployeeHrFunction[];
  }): Promise<boolean> {
    // Info: (20260818 - Julian) 空清單代表「沒有任何職能能滿足這個判斷」，不是「通過」
    if (params.hrFunctions.length === 0) return false;

    const count = await prisma.employeeHrFunctionAssignment.count({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        function: { in: [...params.hrFunctions] },
        revokedAt: null,
      },
    });

    return count > 0;
  }

  public async grant(params: {
    accountBookId: string;
    employeeId: string;
    hrFunction: EmployeeHrFunction;
    grantedByEmployeeId: string | null;
    grantedByEmployeeNo: string;
    grantedByName: string;
    grantReason?: string | null;
  }): Promise<void> {
    const activeKey = activeHrFunctionKeyOf(
      params.employeeId,
      params.hrFunction,
    );

    assertStorableHrFunctionAssignment({
      employeeId: params.employeeId,
      function: params.hrFunction,
      grantedByEmployeeNo: params.grantedByEmployeeNo,
      grantedByName: params.grantedByName,
      revokedAt: null,
      revokedByEmployeeNo: null,
      revokedByName: null,
      activeKey,
    });

    await prisma.employeeHrFunctionAssignment.create({
      data: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        function: params.hrFunction,
        grantedByEmployeeId: params.grantedByEmployeeId,
        grantedByEmployeeNo: params.grantedByEmployeeNo,
        grantedByName: params.grantedByName,
        grantReason: params.grantReason ?? null,
        activeKey,
      },
    });
  }

  public async revoke(params: {
    accountBookId: string;
    employeeId: string;
    hrFunction: EmployeeHrFunction;
    revokedByEmployeeId: string | null;
    revokedByEmployeeNo: string;
    revokedByName: string;
    revokedAt: Date;
    revokeReason?: string | null;
  }): Promise<boolean> {
    /**
     * Info: (20260818 - Julian) 條件式 `updateMany` 而非先查後改：`revokedAt: null`
     * 寫在 `where` 裡，兩個人同時撤銷同一份職能時只有一個會命中
     * （`code_review_checklist.md` §3.2；同 `resolveRecall` 的手法）。
     * `activeKey` 一併清成 null，否則這個人仍會被 `listHolderIds()` 撈出來。
     */
    const { count } = await prisma.employeeHrFunctionAssignment.updateMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        function: params.hrFunction,
        revokedAt: null,
      },
      data: {
        revokedAt: params.revokedAt,
        revokedByEmployeeId: params.revokedByEmployeeId,
        revokedByEmployeeNo: params.revokedByEmployeeNo,
        revokedByName: params.revokedByName,
        revokeReason: params.revokeReason ?? null,
        activeKey: null,
      },
    });

    return count > 0;
  }
}

export const employeeHrFunctionRepo: IEmployeeHrFunctionRepository =
  new EmployeeHrFunctionRepository();
