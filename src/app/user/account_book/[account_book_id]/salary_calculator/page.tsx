import SalaryCalculatorPageBody from "@/components/salary_calculator/salary_calculator_page_body";
import { CalculatorProvider } from "@/contexts/calculator_context";

/**
 * Info: (20260831 - Julian) 帳本版薪資計算機。
 *
 * 與公開版 `/salary_calculator` 渲染的是**同一份** `SalaryCalculatorPageBody`，
 * 差別只有 `accountBookId`：公開版傳 `null`，這裡傳路徑上的帳本（計劃書 §2.4）。
 *
 * 登入閘來自 `src/app/user/layout.tsx` 的 `AuthGuard`，
 * 帳本 id 的 `"default"` 解析來自 `src/app/user/account_book/[account_book_id]/layout.tsx`。
 * 這一層兩者都不必再做一次。
 */
export default async function AccountBookSalaryCalculatorPage({
  params,
}: {
  // Info: (20260831 - Julian) 鍵名必須逐字等於資料夾名（route_params_contract 的教訓）
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return (
    <CalculatorProvider>
      <SalaryCalculatorPageBody accountBookId={accountBookId} />
    </CalculatorProvider>
  );
}
