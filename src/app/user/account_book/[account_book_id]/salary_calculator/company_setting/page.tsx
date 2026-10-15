import CompanySettingPageBody from "@/components/salary_calculator/company_setting_page_body";

/**
 * Info: (20260914 - Julian) 帳本的公司設定。
 *
 * 計劃書：`documents/architecture/salary_company_profile_plan.md`
 *
 * 兩件事：公司抬頭（會印在薪資單與工資清冊上）與**特休年度制度**。
 * 後者才是這一頁的法定理由 —— 細則 §24 II 明定它是勞雇雙方協商的三選一，
 * 而 §38 V 的年度書面通知要靠它算出「年度終結」是哪一天。
 *
 * 這一頁不需要計算機的 provider：它不碰試算狀態，只讀寫帳本層的設定。
 * 角色閘由 `../layout.tsx` 的 `SalaryAccessGate` 負責（`VIEWER` 進不來），
 * 而「改得動」再收一層到 `OWNER`，判準在 API 的 `SalaryAccess.SETTINGS_WRITE`。
 */
export default async function AccountBookCompanySettingPage({
  params,
}: {
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return <CompanySettingPageBody accountBookId={accountBookId} />;
}
