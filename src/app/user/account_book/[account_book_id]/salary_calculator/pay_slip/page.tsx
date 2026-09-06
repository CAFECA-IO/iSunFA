import MyPaySlipPageBody from "@/components/salary_calculator/my_pay_slip_page_body";

/**
 * Info: (20260831 - Julian) 帳本版「我的薪資單」。
 *
 * 從公開的 `/salary_calculator/pay_slip` 搬過來。
 * 需要 calculator context：`MyPaySlipPageBody` 的年／月下拉選項
 * 取自 `useCalculatorCtx()` 的 `yearOptions` / `monthOptions`。
 * provider 由 `../layout.tsx` 提供，三個頁面共用同一個。
 *
 * Info: (20260904 - Julian) 「已寄出」分頁與重寄已接真 API（薪資單寄送計畫 PR C）。
 *
 * ToDo: (20260904 - Julian) 「已收到」分頁仍是 `dummyReceivedData` —— 它要成立
 * 需要先有「員工能登入本站」的概念，而 `SalaryCalculatorEmployee` 不是 `User`
 * （計畫書 §10.6）。
 */
export default async function AccountBookPaySlipPage({
  params,
}: {
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return <MyPaySlipPageBody accountBookId={accountBookId} />;
}
