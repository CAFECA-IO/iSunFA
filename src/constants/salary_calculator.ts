// Info: (20250714 - Julian) ============= 薪資相關常數 =============
export const MIN_BASE_SALARY = 28590;
export const MAX_MEAL_ALLOWANCE = 3000;

// Info: (20250714 - Julian) ============= 工作時數相關常數 =============
export const MIN_WORK_HOURS = 0;
export const MAX_OVERWORK_HOURS = 46;
export const MAX_LEAVE_HOURS = 200;

// Info: (20260831 - Julian) ============= 薪資紀錄相關常數 =============

/**
 * Info: (20260831 - Julian) 計算引擎的版本，格式為「級距表年度.引擎修訂號」。
 *
 * 每一筆薪資紀錄都會存下產生它時的這個值。法規年度更新之後，這一欄是
 * 「這張薪資單當初是用哪一版算出來的」唯一的依據。
 *
 * ToDo: (20260831 - Julian) 改動 `src/constants/salary_levels/` 或
 * `src/lib/utils/salary_calculator.ts` 時要一併 bump。忘了 bump 不會有任何症狀，
 * 直到有人要回答「這張單是哪一版算的」才會發現對不上 —— 目前只能靠 code review。
 */
export const SALARY_CALCULATOR_VERSION = "2026.1";

/**
 * Info: (20260831 - Julian) 輸入驗證的健全性上界（sanity bound），**不是業務規則**。
 *
 * 業務規則（伙食費上限、加班時數上限）在上面各有常數，也在 UI 擋。
 * 這兩個值存在的目的只有一個：擋掉明顯不可能的數字，避免它們變成 BigInt 落地。
 */
export const SALARY_INPUT_MAX_AMOUNT = 1_000_000_000;
export const SALARY_INPUT_MAX_HOURS = 744;

/**
 * Info: (20260831 - Julian) 薪資基準天數的計算方式。
 * 原本是 context 裡的字串陣列 ['FIXED', 'ACTUAL'] 與散落的 === 'FIXED' 比對。
 */
export enum PayrollDaysBase {
  FIXED = "FIXED",
  ACTUAL = "ACTUAL",
}
