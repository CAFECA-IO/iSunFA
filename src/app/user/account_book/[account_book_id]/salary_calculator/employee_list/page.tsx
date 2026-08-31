import EmployeeListPageBody from "@/components/salary_calculator/employee_list_page_body";

/**
 * Info: (20260831 - Julian) 帳本版員工列表。
 *
 * 從公開的 `/salary_calculator/employee_list` 搬過來：員工名單掛在帳本之下，
 * 沒有帳本就沒有名單可看，放在公開路由沒有意義（計劃書 §2.4）。
 *
 * ToDo: (20260831 - Julian) 內容目前仍是 `dummyEmployeeForCalc`，PR 4 接真 API。
 */
export default async function AccountBookEmployeeListPage({
  params,
}: {
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return <EmployeeListPageBody accountBookId={accountBookId} />;
}
