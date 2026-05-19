import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId } = await params;

    // Info: (20260420 - Luphia) 檢查帳本是否存在
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);

    // Info: (20260420 - Luphia) 檢查使用者是否有權限
    const teamMember = await teamRepo.getTeamMember(
      sessionUser.id,
      accountBook.teamId,
    );
    if (!teamMember) return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);

    // Info: (20260420 - Luphia) 更新所有未完成的日記帳
    const count = await journalRepo.verifyAllJournals(accountBookId);

    return jsonOk({ count });
  } catch (error) {
    console.error("API Error:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_VERIFY_JOURNALS);
  }
}
