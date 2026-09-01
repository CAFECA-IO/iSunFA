import SalaryRecordsPageBody from "@/components/salary_calculator/salary_records_page_body";

/**
 * Info: (20260831 - Julian) 薪資紀錄查閱。
 *
 * 「載回計算機」透過 context 的 `loadFromSnapshot` 把輸入快照灌回去，
 * 而那顆 provider 在 `../layout.tsx` —— 必須與計算機頁共用同一個實例，
 * 否則導頁的當下就連同 state 一起卸載了。
 */
export default async function AccountBookSalaryRecordsPage({
  params,
}: {
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return <SalaryRecordsPageBody accountBookId={accountBookId} />;
}
