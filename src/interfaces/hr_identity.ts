import { EmployeeHrFunction } from "@/constants/hr_management";

/**
 * Info: (20260818 - Julian) 「我是誰、我在這個帳本裡能做什麼」。
 *
 * ## 為什麼需要它
 *
 * 前端在此之前沒有任何身分訊號：`useAuth()` 給的是**登入帳號**（`User.name`），
 * 而人事系統裡有意義的是**員工檔**（工號、職稱、部門、是不是主管）。
 * 兩者之間隔著 `Employee.userId` 這道綁定，而綁定只有伺服器解得開。
 *
 * 缺了它的具體後果有兩個，都實際發生過：
 * 1. 側邊欄無法判斷該不該顯示簽核入口，只能改用「待簽清單是不是空的」代替 ——
 *    而那會把剛升上來、還沒有人送單的主管擋在門外。
 * 2. 畫面上看不出自己是誰，切換演示身分之後只能靠額度卡反推。
 *
 * ## 為什麼不含個資
 *
 * 只有姓名、工號、職稱、部門 —— 全部是同事之間本來就看得到的資訊
 * （ADR 018 Tier 1）。電話、信箱、身分證號一律不在這裡，
 * 那些要走專屬端點並留下 `AuditLog`。
 */
export interface IHrIdentityView {
  employeeId: string;
  employeeNo: string;
  name: string;
  /** Info: (20260818 - Julian) 職稱與部門可為 null：兩個外鍵都是 SetNull */
  jobTitle: string | null;
  departmentName: string | null;
  /**
   * Info: (20260818 - Julian) 他是某個部門的 `managerId`。
   *
   * 這是**顯示用**的判準，不是授權判準 —— 「他管不管得到某個人」要用
   * `managesEmployee()` 比對部門子樹（`employee.repo` 那兩支刻意都留著的理由：
   * 顯示按鈕與允許動作是兩個不同的問題）。前端藏不藏都不影響安全，
   * 每一支端點自己仍會擋。
   */
  isDepartmentManager: boolean;
  /** Info: (20260818 - Julian) 仍生效的 HR 職能（`HR_ADMIN` / `TIMEKEEPER`） */
  hrFunctions: EmployeeHrFunction[];
}
