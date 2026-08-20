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
  /**
   * Info: (20260820 - Julian) 被調整的人（review 第 5 條）。
   *
   * 這個參數先前**不存在** —— 於是「對象是不是自己」在型別上就問不出來，
   * 而上面那段自己寫下的洞（「任何一個同帳本的員工都可以對任何人
   * **包含自己**反覆加額度」）只被補了前半：換成 HR_ADMIN 之後，
   * 「包含自己」這一半原封不動。
   */
  targetEmployeeId: string;
}): Promise<void> {
  /**
   * Info: (20260820 - Julian) **不得調整自己的額度**（review 第 5 條）。
   *
   * 與 §32 IV 認定的自我檢查（`declareEmergency`）是同一個形狀，
   * 而代價更直接：`deltaMinutes` 的上界是 ±366 天，冪等鍵是 `randomUUID()`
   * （刻意的，人工調整本來就允許重複），因此連打有效 ——
   * 一個 HR_ADMIN 可以在一分鐘內給自己加上任意多的特休，
   * 而未休完的特休依 §38 IV 折現發給工資。這個檔案自己寫著：
   * 「額度不是一個顯示用的數字，它會變成錢……一筆憑空的調整，
   * 最後會出現在薪資單上。」
   *
   * 排在職能查詢**之前**：順序反過來的話，一個 HR_ADMIN 會先通過職能查詢，
   * 而那正是這條要擋的組合（同 `declareEmergency` 的既有處置）。
   *
   * 這不會讓 HR_ADMIN 拿不到自己該有的額度：法定的部分由
   * `accrueForEmployee` 依 `deriveGrantSchedule` 產生（見
   * `assertMayAccrueBalance`），那一支算得出「應然」而生不出額外的量。
   * 真的需要人工調整自己的額度時，找另一位 HR_ADMIN ——
   * 那正是職責分離要的東西。
   */
  if (params.actorEmployeeId === params.targetEmployeeId) {
    throw new AppError(API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN);
  }

  if (await isHrAdmin(params.accountBookId, params.actorEmployeeId)) return;
  throw new AppError(API_ERRORS.FO_HR_FUNCTION_REQUIRED);
}

/**
 * Info: (20260820 - Julian) 授予（L33）：限 `HR_ADMIN`，但**允許對自己**（review 第 5 條）。
 *
 * 與 `assertMayAdjustBalance` 分成兩支而不是共用一支帶旗標的：兩者放行的
 * 集合不同，而「同一支函式靠參數決定嚴不嚴格」正是下一個人會傳錯的地方。
 *
 * 為什麼授予可以對自己：`accrueForEmployee` 交出去的是
 * `deriveGrantSchedule` 算出的**應然**（到 `asOfDate` 為止依年資該有哪些批次），
 * 對自己跑一次與對別人跑一次結果都一樣，且它是冪等的
 * （`LeaveLedgerEntry.idempotencyKey` 為 `@unique`，鍵含週期起始日，
 * 同一週期的第二批會撞鍵並回滾整個交易）。反過來擋掉的話，
 * 一個只有一位人資的公司裡，那位人資的特休永遠沒有人授予得了 ——
 * 那是 B7 撞到過的同一個空集合。
 *
 * ⚠️ Info: (20260820 - Julian) 上面那句「生不出多的」曾經**是假的**
 * （review 第 9 輪第 2 條）。`asOfDate` 就是排程的 horizon，而它沒有上界，
 * 曆年制的排程迴圈也沒有防呆上界 —— `"9999-12-31"` 一次請求就鑄出
 * **7,980 批、239,117 日**（實測）。
 *
 * 三道各自獨立的修正之後它才成立：`asOfDate` 不得指向未來（本檔的呼叫端
 * `accrueForEmployee`）、排程迴圈的 `MAX_PLANNED_CYCLES`（引擎）、
 * 以及可扣批次的 `cycleStartDate ≤ asOfDate`（`consumableGrantWhere`）。
 *
 * 這件事本身值得記著：**用一段站不住的論證放寬一道閘，比沒有那道閘更難被
 * 下一個人發現** —— 他讀到理由寫得很完整，就不會再去驗那個前提。
 *
 * `actorEmployeeId` 為 null 代表系統（seed 與日後的每日 Worker），
 * 由呼叫端在進來之前就分流，不受此閘限制。
 */
export async function assertMayAccrueBalance(params: {
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
