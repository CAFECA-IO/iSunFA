export const ISUNFA_ROUTE = {
  HOME: "/",

  /**
   * Info: (20260224 - Julian) 公開版薪資計算機（未登入即可使用）。
   *
   * Info: (20260831 - Julian) 員工列表與薪資單已搬到帳本路由下，
   * 因此這裡只剩兩條 —— 那兩件事都需要一本帳才有意義（計劃書 §2.4）。
   */
  SALARY_CALCULATOR: "/salary_calculator",
  OPERATING_MECHANISM: "/salary_calculator/operating_mechanism",

  /**
   * Info: (20260831 - Julian) 公開版通往帳本版的入口。
   *
   * `default` 會被 `src/app/user/account_book/[account_book_id]/layout.tsx`
   * 攔下來，導去帳本選擇頁（`/user/account_book?uri_query=/salary_calculator`），
   * 選完之後再帶回同一個後綴。因此這裡不需要知道使用者有哪些帳本，
   * 也不需要自己記住他選過哪一本 —— 首頁的功能卡片用的是同一條鏈
   * （`src/components/landing_page/features.tsx`）。
   */
  SALARY_CALCULATOR_ACCOUNT_BOOK_ENTRY:
    "/user/account_book/default/salary_calculator",
};

/**
 * Info: (20260831 - Julian) 帳本版薪資計算機的路由。
 *
 * 帶路徑參數的一律寫成函式，不讓呼叫端自己接字串
 * （形狀照 `src/constants/leave_api.ts`，但帳本 id 由呼叫端從路由參數傳入，
 * 不硬編碼 demo 帳本）。
 */
export const salaryCalculatorUrlOf = (accountBookId: string) =>
  ({
    CALCULATOR: `/user/account_book/${accountBookId}/salary_calculator`,
    PAY_SLIP: `/user/account_book/${accountBookId}/salary_calculator/pay_slip`,
    RECORDS: `/user/account_book/${accountBookId}/salary_calculator/records`,
  }) as const;
