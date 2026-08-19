import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { EmployeeHrFunction } from "@/constants/hr_management";
import { employeeRepo } from "@/repositories/employee.repo";
import { employeeHrFunctionRepo } from "@/repositories/employee_hr_function.repo";

/**
 * Info: (20260819 - Julian) 「誰看得到、誰動得了額度」。比照 `overtime_visibility.ts`。
 *
 * ## 為什麼抽出來而不是寫在四支 route 裡
 *
 * 額度有四個入口（L7 餘額、L8 帳本、L9 人工調整、L33 授予），而它們對
 * 同一個問題必須給同一個答案。在 route 各寫一次，遲早出現「餘額看不到、
 * 但異動明細看得到」這種對不起來的狀態 —— 而那種缺口不會有人回報，
 * 因為看得到的人不會覺得有問題。放在 service 開頭，繞不過去：
 * seed 與日後的 Worker 也走同一條路。
 *
 * ## 讀與寫是兩道不同的閘（checklist §4.3）
 *
 * 讀：本人／管得到他的主管／`HR_ADMIN`。主管要排班就得看得到組員的餘額。
 * 寫：**只有 `HR_ADMIN`**。額度會變成錢（未休折現依 §38 IV 發給工資），
 * 而主管對組員的加薪權不會因為他是主管就自動存在。
 */

/**
 * Info: (20260819 - Julian) 讀某人的額度與額度帳本。
 *
 * 授權一律走 `managesEmployee()` 而不是 `isDepartmentManager()`：後者只答
 * 「你是不是某個部門的主管」，拿它當授權，第一工務段的主管就看得到
 * 第五工務段的人（接線守則 §3.5.3，同 `assertMayViewOvertimeOf` 的理由）。
 */
export async function assertMayViewLeaveBalanceOf(params: {
  accountBookId: string;
  actorEmployeeId: string;
  targetEmployeeId: string;
}): Promise<void> {
  if (params.actorEmployeeId === params.targetEmployeeId) return;

  const manages = await employeeRepo.managesEmployee({
    accountBookId: params.accountBookId,
    managerEmployeeId: params.actorEmployeeId,
    targetEmployeeId: params.targetEmployeeId,
  });
  if (manages) return;

  if (await isHrAdmin(params.accountBookId, params.actorEmployeeId)) return;

  /**
   * Info: (20260819 - Julian) 回 403 而不是空結果。
   *
   * 空結果是對資料的陳述（「他沒有任何額度」），被擋是對請求的陳述 ——
   * 混在一起會讓沒有權限的人以為那個人真的沒有額度
   * （同 `assertMayViewOvertimeOf` 的既有處置）。
   */
  throw new AppError(API_ERRORS.FO_NO_PERMISSION_TO_VIEW_THIS);
}

/**
 * Info: (20260819 - Julian) 動別人的額度：人工調整（L9）與授予（L33）。**限 `HR_ADMIN`。**
 *
 * ## 為什麼比讀取嚴格得多
 *
 * 額度不是一個顯示用的數字，它會變成錢：未休完的特休依 §38 IV 折現發給工資，
 * 補休屆期未休依 §32-1 折現。一筆憑空的調整，最後會出現在薪資單上。
 *
 * 而在補上這道閘之前，`adjust` 的授權判斷是**不存在的** —— 任何一個同帳本的
 * 員工都可以對任何人（包含自己）反覆加額度，`deltaMinutes` 上界 366 天、
 * 冪等鍵是隨機值所以連打有效。這不是「能力還沒做」：`hasAnyFunction()`
 * 在同一輪就已經存在，而假別設定、簽核規則、加班政策三支都已經在用它
 * （checklist §5.4：判定平台做不到之前，先找產品裡有沒有已經在做的地方）。
 *
 * ## 為什麼授予也走這一道
 *
 * `accrueForEmployee` 只補「應然」的批次、不會憑空多給，看似無害。但它仍是
 * 對別人帳本的寫入，而它真正的歸宿是每日 Worker（那條路徑傳 `actorEmployeeId`
 * 為 null，代表系統而非某個人，不受此閘限制）。手動端點是 Worker 上線前的
 * 替身，替身沒有理由比本尊寬鬆。
 */
export async function assertMayAdjustBalance(params: {
  accountBookId: string;
  actorEmployeeId: string;
}): Promise<void> {
  if (await isHrAdmin(params.accountBookId, params.actorEmployeeId)) return;
  throw new AppError(API_ERRORS.FO_HR_FUNCTION_REQUIRED);
}

const isHrAdmin = (
  accountBookId: string,
  employeeId: string,
): Promise<boolean> =>
  employeeHrFunctionRepo.hasAnyFunction({
    accountBookId,
    employeeId,
    hrFunctions: [EmployeeHrFunction.HR_ADMIN],
  });
