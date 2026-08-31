import SalaryRecordsPageBody from "@/components/salary_calculator/salary_records_page_body";
import { CalculatorProvider } from "@/contexts/calculator_context";

/**
 * Info: (20260831 - Julian) 薪資紀錄查閱。
 *
 * 包在 `CalculatorProvider` 裡是因為「載回計算機」要透過 context 的
 * `loadFromSnapshot` 把輸入快照灌回去 —— 那個 provider 也是計算機頁用的同一個。
 */
export default async function AccountBookSalaryRecordsPage({
  params,
}: {
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return (
    <CalculatorProvider>
      <SalaryRecordsPageBody accountBookId={accountBookId} />
    </CalculatorProvider>
  );
}
