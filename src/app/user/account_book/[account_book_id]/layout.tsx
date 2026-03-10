import { ReactNode } from "react";
import { redirect } from "next/navigation";

export default async function AccountBookLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ account_book_id: string }>;
}) {
  const { account_book_id: accountBookId } = await params;

  if (accountBookId === "default") {
    redirect("/user/account_book");
  }

  return <>{children}</>;
}
