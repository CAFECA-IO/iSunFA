import { ReactNode } from "react";
import RedirectDefault from "@/app/user/account_book/[account_book_id]/redirect_default";
import FaithAgent from "@/components/user/faith_agent";

/**
 * Info: (20260812 - Luphia) 費思掛在帳本 layout 而非 /user/layout（設計書 §5.3「使用前提」）：
 * 「選定帳本後才能使用費思」——計費團隊由 AccountBook.teamId 推導，
 * 無帳本情境（/user/main、/user/team、帳本選擇頁…）連入口都不出現，
 * 而不是讓用戶點開後才發現算不出該扣誰的額度。
 */
export default async function AccountBookLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  if (accountBookId === "default") {
    return <RedirectDefault />;
  }

  return (
    <>
      {children}
      <FaithAgent accountBookId={accountBookId} />
    </>
  );
}
