import { ReactNode } from "react";
import RedirectDefault from "@/app/user/account_book/[account_book_id]/redirect_default";

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

  return <>{children}</>;
}
