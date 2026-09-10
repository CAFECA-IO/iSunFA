import { ReactNode } from "react";
import { CalculatorProvider } from "@/contexts/calculator_context";
import SalaryAccessGate from "@/components/salary_calculator/salary_access_gate";

/**
 * Info: (20260901 - Julian) 帳本版薪資計算機底下的頁面共用**同一個** CalculatorProvider。
 *
 * ## 為什麼要提到 layout
 *
 * 原本每個 `page.tsx` 各自包一層 provider。同一份程式碼、不同的實例 ——
 * 於是薪資紀錄頁的「載回計算機」寫進去的是紀錄頁那顆 provider 的 state，
 * 而 `router.push` 導到計算機頁時，那顆 provider 隨著頁面卸載，
 * 計算機頁掛上的是一顆全新的、停在預設值的 provider。按鈕看起來沒有反應。
 *
 * App Router 的 layout 在同層路由之間切換時**不會重新掛載**，
 * 所以把 provider 提到這一層，state 才跨得過那次導頁。
 *
 * ## 這一層不做登入閘，但做角色閘
 *
 * 登入來自 `src/app/user/layout.tsx` 的 `AuthGuard`，
 * 帳本 id 的 `"default"` 解析來自 `../layout.tsx`。
 *
 * Info: (20260908 - Julian) 角色閘（`SalaryAccessGate`）掛在這裡，理由與 provider 相同 ——
 * 這一層不隨頁面切換重新掛載，所以「我在這本帳是什麼角色」只問一次、四個頁面共用。
 * 它擋的是**畫面**：安全邊界仍在伺服器（十三支端點的 `assertSalaryAccountBookAccess`），
 * 這一層存在的理由是不要讓 `VIEWER` 看到「載入失敗，請稍後再試」而去回報一個不存在的故障。
 *
 * 順序上閘在 provider 之內：被擋下來的人不會 render 任何頁面，
 * 但 provider 的建立成本近乎零，而把它放外面可以讓兩件事各自讀得懂。
 */
export default async function AccountBookSalaryCalculatorLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return (
    <CalculatorProvider>
      <SalaryAccessGate accountBookId={accountBookId}>
        {children}
      </SalaryAccessGate>
    </CalculatorProvider>
  );
}
