import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";

/**
 * Info: (20260904 - Julian) 員工名單的過濾與計數，抽成純函式。
 *
 * 這些判斷原本散在 `employee_list_modal` 的 `useMemo` 與
 * `salary_records_page_body` 的 `sendTargetOf` 裡。本專案的測試不 render React，
 * 留在元件裡等於它們永遠只能靠手動點過 —— 而「員工的信箱是三個空白」
 * 這種情況不會有人手動試出來。
 */

/**
 * Info: (20260904 - Julian) 過濾只認姓名與編號，**不比對信箱**。
 *
 * 整頁版顯示信箱欄，看起來「應該也能搜信箱」—— 但同一個元件也是計算機
 * Step 1 的挑人彈窗，在那個情境搜信箱沒有意義。兩邊共用一份行為，
 * 而這裡選的是兩邊都說得通的那一種。要找信箱有問題的人，用下面的
 * `onlyMissingEmail`，那是這一頁真正要回答的問題。
 */
type IEmployeeLike = Pick<
  ISalaryCalculatorEmployee,
  "name" | "number" | "email"
>;

export interface IEmployeeListFilter {
  keyword: string;
  onlyMissingEmail: boolean;
}

/**
 * Info: (20260904 - Julian) 「這位員工收得到薪資單嗎」只有這一個定義。
 *
 * 判斷是 `trim() === ""` 而不是 `!email`，兩個理由：
 *
 * 1. repository 把 DB 的 `null` 映成空字串（`salary_calculator_employee.repo.ts`），
 *    所以前端永遠拿不到 `null`，`!email` 只擋得到 `""`。
 * 2. 使用者在表單裡打幾個空白再存，DB 拿到的是 `"   "` —— 那既不是 `null`
 *    也不是 `""`，`!email` 判定為「有信箱」，然後 nodemailer 才在寄送當下失敗。
 *
 * `salary_records_page_body` 的寄出鈕與這一頁的缺信箱標示問的是同一個問題，
 * 各寫一次的話，改了 trim 這件事只會改到其中一邊。
 */
export const hasNoEmail = (
  employee: Pick<ISalaryCalculatorEmployee, "email">,
): boolean => employee.email.trim() === "";

export const countMissingEmail = (
  employees: readonly IEmployeeLike[],
): number => employees.filter(hasNoEmail).length;

export const filterEmployees = <T extends IEmployeeLike>(
  employees: readonly T[],
  { keyword, onlyMissingEmail }: IEmployeeListFilter,
): T[] => {
  const trimmed = keyword.trim().toLowerCase();

  return employees.filter((employee) => {
    if (onlyMissingEmail && !hasNoEmail(employee)) return false;
    if (trimmed === "") return true;

    return (
      employee.name.toLowerCase().includes(trimmed) ||
      employee.number.toLowerCase().includes(trimmed)
    );
  });
};
