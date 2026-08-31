"use client";

import { FC, ReactNode } from "react";
import CalculatorHeader from "@/components/salary_calculator/calculator_header";

interface ISalaryCalculatorShellProps {
  /**
   * Info: (20260831 - Julian) null = 公開試算模式（`/salary_calculator`）。
   * 有值 = 帳本版（`/user/account_book/[account_book_id]/salary_calculator`）。
   *
   * 這是公開版與帳本版**唯一**的分岔點。子元件不要另外用 `useAuth()` 判斷 ——
   * 兩個判斷來源遲早會不一致（計劃書 §2.4）。
   */
  accountBookId: string | null;
  children: ReactNode;
}

/**
 * Info: (20260831 - Julian) 薪資計算機各頁共用的外框。
 *
 * 兩條路由渲染同一份計算機，差別只有外框：
 *
 * - 公開版是一個獨立頁面，自帶 `CalculatorHeader`（BrandLogo、語言選擇、登入按鈕）。
 * - 帳本版活在 `src/app/user/layout.tsx` 底下，那裡已經有 `UserHeader` /
 *   `UserFooter` 與 `<main>`。再包一層會產生巢狀 `<main>`（無效的 HTML），
 *   而 BrandLogo 與語言選擇器會出現兩次。
 *
 * 把這個判斷收在一個元件裡，是為了讓「兩版差在哪」是一段讀得完的程式碼，
 * 而不是散在三個 page body 各自的 JSX 開頭。
 */
const SalaryCalculatorShell: FC<ISalaryCalculatorShellProps> = ({
  accountBookId,
  children,
}) => {
  if (accountBookId !== null) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      <CalculatorHeader />
      {children}
    </main>
  );
};

export default SalaryCalculatorShell;
