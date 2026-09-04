import EmployeeListPageBody from "@/components/salary_calculator/employee_list_page_body";

/**
 * Info: (20260904 - Julian) 帳本版員工列表。
 *
 * 員工名單掛在帳本之下，沒有帳本就沒有名單可看，因此沒有公開版對應路由
 * （計劃書 §2.4）。同理它不進 `sitemap.ts` —— `/user/**` 需要登入，
 * 列進去只會讓爬蟲拿到一串 401。
 */
export default async function AccountBookEmployeeListPage({
  params,
}: {
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return <EmployeeListPageBody accountBookId={accountBookId} />;
}
