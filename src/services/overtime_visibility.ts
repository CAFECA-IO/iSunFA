import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { EmployeeHrFunction } from "@/constants/hr_management";
import { employeeRepo } from "@/repositories/employee.repo";
import { employeeHrFunctionRepo } from "@/repositories/employee_hr_function.repo";

/**
 * Info: (20260818 - Julian) 「誰看得到誰的加班」。
 *
 * 三種人：本人、管得到他的主管、具 `HR_ADMIN` 職能者。抽成一支共用函式
 * 而不是在三支端點各寫一次 —— 可見範圍一旦在多處各有一份，
 * 遲早會出現「清單看得到、統計看不到」這種對不起來的狀態。
 *
 * 授權一律走 `managesEmployee()` 而不是 `isDepartmentManager()`：後者只答
 * 「你是不是某個部門的主管」，拿它當授權，第一工務段的主管就看得到
 * 第五工務段的人（接線守則 §3.5.3）。
 *
 * ToDo: (20260818 - Julian) 加班時數本身不是 Tier 2 個資（計畫書 §12 未把
 * `OvertimeRequest` 列入 `HrPiiTable`），但「誰在加班」仍是一份可以拿來
 * 推論的資料。可見範圍分級（§9.2）在里程碑 5 才收斂，屆時這支要一併對齊。
 */
/**
 * Info: (20260819 - Julian) 相依以參數注入，預設綁模組層單例（review B9）。
 *
 * 先前這支直接呼叫 `employeeRepo` 與 `employeeHrFunctionRepo` 兩個單例，
 * 於是**它是三支端點的唯一授權點，卻沒有辦法在不 `jest.mock` 整個
 * repository 模組的情況下測**。而 `next/jest`(SWC) 下具名 import 的
 * `jest.mock` 工廠不會被提升，那條路本身就是一個已知的坑
 * （見 `carbon_access.test.ts` 檔頭）。
 *
 * 預設值讓 12 個既有呼叫端一行都不必改；測試傳自己的兩支進來。
 * 這不是為了測試而扭曲設計 —— 一個「可見範圍」的判斷本來就只依賴
 * 「他管不管得到」與「他是不是 HR」這兩個問題的答案，
 * 而不依賴那兩個答案是從哪個單例來的。
 */
export interface IOvertimeVisibilityDeps {
  managesEmployee(params: {
    accountBookId: string;
    managerEmployeeId: string;
    targetEmployeeId: string;
  }): Promise<boolean>;
  hasAnyFunction(params: {
    accountBookId: string;
    employeeId: string;
    hrFunctions: readonly EmployeeHrFunction[];
  }): Promise<boolean>;
}

const defaultDeps: IOvertimeVisibilityDeps = {
  managesEmployee: (params) => employeeRepo.managesEmployee(params),
  hasAnyFunction: (params) =>
    employeeHrFunctionRepo.hasAnyFunction({
      ...params,
      hrFunctions: [...params.hrFunctions],
    }),
};

export async function assertMayViewOvertimeOf(
  params: {
    accountBookId: string;
    actorEmployeeId: string;
    targetEmployeeId: string;
  },
  deps: IOvertimeVisibilityDeps = defaultDeps,
): Promise<void> {
  if (params.actorEmployeeId === params.targetEmployeeId) return;

  const manages = await deps.managesEmployee({
    accountBookId: params.accountBookId,
    managerEmployeeId: params.actorEmployeeId,
    targetEmployeeId: params.targetEmployeeId,
  });
  if (manages) return;

  const isHr = await deps.hasAnyFunction({
    accountBookId: params.accountBookId,
    employeeId: params.actorEmployeeId,
    hrFunctions: [EmployeeHrFunction.HR_ADMIN],
  });
  if (isHr) return;

  /**
   * Info: (20260818 - Julian) 回 403 而不是空陣列。
   *
   * 空陣列是對資料的陳述（「他沒有加班過」），被擋是對請求的陳述 ——
   * 兩者混在一起會讓一個沒有權限的人以為那個人真的沒加過班
   * （同 L10 對 `FO_LEAVE_REQUEST_SCOPE` 的既有處置）。
   */
  throw new AppError(API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS);
}
