import { LeaveYearScheme } from "@/generated";

/**
 * Info: (20260914 - Julian) 帳本的公司設定。
 *
 * 計劃書：`documents/architecture/salary_company_profile_plan.md`
 *
 * **這一份資料裡唯一有法源的是 `leaveYearScheme`。**
 * 工資明細（細則 §14-1）四款全是金額、工資清冊（本法 §23 II）三項也全是金額，
 * 兩邊都不要求雇主名稱 —— 抬頭那幾格是實務慣例。
 * 而特休年度制度是細則 §24 II 明定由勞雇雙方協商的三選一，
 * 也是 §38 V「每年定期以書面通知勞工」算得出年度終結日的前提。
 */
export interface IAccountBookCompanyProfile {
  /**
   * Info: (20260914 - Julian) 事業單位名稱。會印在薪資單與工資清冊上。
   *
   * 沒有分成「公司名稱」與「雇主名稱」兩格：勞基法 §2① 的「雇主」是涵蓋
   * 事業主、負責人、代表事業主處理勞工事務之人的**法律定義**，不是欄位。
   */
  entityName: string;
  taxId: string | null;
  responsiblePerson: string | null;
  address: string | null;
  /**
   * Info: (20260914 - Julian) `null` ＝ **還沒選**，不是預設值。
   *
   * 這一格刻意沒有 `@default`：給了預設值，既有帳本會「看起來已經設定好」
   * 而其實沒有人選過（同 `SalaryRecord.baseSalary` 的 `@default(0)`，
   * 部署檢查表 §1.4.1）。選錯會讓每一位員工的年度終結日整個移位。
   */
  leaveYearScheme: LeaveYearScheme | null;
  /** Info: (20260914 - Julian) 只有 `CUSTOM` 用得到；另外兩制算得出來 */
  leaveYearStartMonth: number | null;
  leaveYearStartDay: number | null;
}

/**
 * Info: (20260914 - Julian) 還沒設定過的帳本回這個，而不是 `null`。
 *
 * 回 `null` 的話，每一個呼叫端都要自己決定「沒設定」長什麼樣子 ——
 * 而前端表單需要的是一組可以直接綁的空值。`isConfigured` 讓
 * 「還沒設定」與「設定成空字串」在型別上分得開。
 */
export interface IAccountBookCompanyProfileView extends IAccountBookCompanyProfile {
  isConfigured: boolean;
}
