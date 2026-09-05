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
  "name" | "number" | "email" | "missingPeriods"
>;

export interface IEmployeeListFilter {
  keyword: string;
  onlyMissingEmail: boolean;
  /**
   * Info: (20260905 - Luphia) 只看有薪資單缺漏的人（#6774）。
   *
   * 與 `onlyMissingEmail` 各自獨立、可以同時打開：兩個問題不同
   *（收不到 vs 沒有東西可收），而「兩個都有問題的那幾位」正是最該先處理的。
   */
  onlyMissingRecords: boolean;
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
  { keyword, onlyMissingEmail, onlyMissingRecords }: IEmployeeListFilter,
): T[] => {
  const trimmed = keyword.trim().toLowerCase();

  return employees.filter((employee) => {
    if (onlyMissingEmail && !hasNoEmail(employee)) return false;
    if (onlyMissingRecords && !hasMissingPeriods(employee)) return false;
    if (trimmed === "") return true;

    return (
      employee.name.toLowerCase().includes(trimmed) ||
      employee.number.toLowerCase().includes(trimmed)
    );
  });
};

/**
 * Info: (20260905 - Luphia) 這位員工有沒有月份漏掉薪資單（#6774）。
 *
 * 判斷只看陣列長度 —— 空陣列同時代表「完整」與「算不出來」（沒有到職日、
 * 超過掃描上限），而兩者對畫面的處置一樣：不標示。理由見
 * `missingSalaryPeriods`：不知道就不要說。
 */
export const hasMissingPeriods = (
  employee: Pick<ISalaryCalculatorEmployee, "missingPeriods">,
): boolean => employee.missingPeriods.length > 0;

export const countMissingRecords = (
  employees: readonly IEmployeeLike[],
): number => employees.filter(hasMissingPeriods).length;

/**
 * Info: (20260905 - Luphia) 缺漏的月份 → 一行字（#6774）。
 *
 * `2026/03、2026/06` 這個形狀：年份不能省，因為缺漏經常跨年
 *（去年 11 月到職、今年才開始建薪資單）。
 *
 * 超過 `limit` 個就截斷並回報剩幾個 —— 一個到職三年沒建過薪資單的人
 * 會有 36 個月份，那串字會把整列擠爆。截斷的是**顯示**不是判斷，
 * 所以與 `missingSalaryPeriods` 的「超過上限就回空」不衝突。
 */
export const MISSING_PERIOD_PREVIEW_LIMIT = 6;

export const formatMissingPeriods = (
  periods: readonly { year: number; month: number }[],
  limit: number = MISSING_PERIOD_PREVIEW_LIMIT,
): { text: string; restCount: number } => {
  const shown = periods.slice(0, limit);
  const text = shown
    .map(({ year, month }) => `${year}/${month.toString().padStart(2, "0")}`)
    .join("、");

  return { text, restCount: periods.length - shown.length };
};
