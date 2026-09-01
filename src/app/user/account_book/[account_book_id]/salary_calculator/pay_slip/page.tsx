import MyPaySlipPageBody from "@/components/salary_calculator/my_pay_slip_page_body";

/**
 * Info: (20260831 - Julian) 帳本版「我的薪資單」。
 *
 * 從公開的 `/salary_calculator/pay_slip` 搬過來。
 * 需要 calculator context：`MyPaySlipPageBody` 的年／月下拉選項
 * 取自 `useCalculatorCtx()` 的 `yearOptions` / `monthOptions`。
 * provider 由 `../layout.tsx` 提供，三個頁面共用同一個。
 *
 * ToDo: (20260831 - Julian) 收發件匣仍是 `dummyReceivedData` / `dummySentData`，
 * 且寄送與重寄仍是 `console.log` —— 薪資單收發不在本次範圍（計劃書 §12）。
 */
export default async function AccountBookPaySlipPage({
  params,
}: {
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  return <MyPaySlipPageBody accountBookId={accountBookId} />;
}
