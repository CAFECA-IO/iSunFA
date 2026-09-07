import { Employee } from "@/generated";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { IHrIdentityView } from "@/interfaces/hr_identity";
import {
  employeeHrFunctionRepo,
  IEmployeeHrFunctionRepository,
} from "@/repositories/employee_hr_function.repo";
import {
  employeeRepo,
  IEmployeeRepository,
} from "@/repositories/employee.repo";

/**
 * Info: (20260818 - Julian) 「我是誰、我能做什麼」（`GET .../hr/me`）。
 *
 * ## 為什麼收 `Employee` 而不是 `IUser`
 *
 * 綁定（登入帳號 → 員工檔）由 route 呼叫 `attendanceIdentityService.resolveEmployee`
 * 完成，這一支只收結果。第一版把綁定藏在這裡面，於是 route 的檔案裡看不到
 * `resolveEmployee` —— 而 `attendance_rate_limit.test.ts` 正是以它為「業務邏輯
 * 從這裡開始」的錨點，用來證明限流排在業務邏輯之前。錨點被藏起來，
 * 那條保證就變成靜默跳過（測試也確實當場擋下來了）。
 *
 * 把綁定留在 route 還有一個好處：這一支不再依賴另一支 service，
 * 只依賴兩個 repository —— 職責從「查身分並描述它」收斂成「描述一個已知的身分」。
 *
 * ## 這一支不做授權
 *
 * `isDepartmentManager` 是給畫面決定「要不要顯示這個入口」用的。
 * 真正的授權在每一支端點自己（假單比對簽核鏈上的 `approverEmployeeId`、
 * 加班比對 `listManagedEmployeeIds` 的子樹）。前端藏不藏都不影響安全，
 * 藏起來只是為了不讓一個永遠是空的選單佔著位置。
 */
export class HrIdentityService {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly functions: IEmployeeHrFunctionRepository,
  ) {}

  public async describe(employee: Employee): Promise<IHrIdentityView> {
    /**
     * Info: (20260818 - Julian) 帳本取自員工檔本身，不另外收一個參數。
     * `resolveEmployee` 已經確認過它與路徑上的帳本一致（不一致會回 404），
     * 再收一次只會多出一個兩者可能不同的空間。
     */
    const scope = {
      accountBookId: employee.accountBookId,
      employeeId: employee.id,
    };

    const [profile, isDepartmentManager, hrFunctions] = await Promise.all([
      this.employees.findProfile(scope),
      this.employees.isDepartmentManager(scope),
      this.functions.listFunctionsOf(scope),
    ]);

    /**
     * Info: (20260818 - Julian) 呼叫端才剛拿到這一列，這裡卻查不到 ——
     * 只可能是查與查之間被刪掉了。回 404 而不是拿 `employee` 的欄位頂替：
     * 頂替會讓一個已經不存在的員工看起來仍然正常。
     */
    if (profile === null) {
      throw new AppError(API_ERRORS.NF_EMPLOYEE_FOR_USER);
    }

    return {
      employeeId: employee.id,
      employeeNo: profile.employeeNo,
      name: profile.name,
      jobTitle: profile.jobTitle,
      departmentName: profile.departmentName,
      isDepartmentManager,
      hrFunctions,
    };
  }
}

export const hrIdentityService = new HrIdentityService(
  employeeRepo,
  employeeHrFunctionRepo,
);
