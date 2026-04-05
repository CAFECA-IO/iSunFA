import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(ApiCode.UNAUTHORIZED, "Unauthorized");

    const { account_book_id: accountBookId } = await params;

    // Info: (20260322 - Luphia) 檢查帳本是否存在
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook)
      return jsonFail(ApiCode.NOT_FOUND, "Account book not found");

    // Info: (20260322 - Luphia) 檢查使用者是否有權限
    const teamMember = await teamRepo.getTeamMember(
      sessionUser.id,
      accountBook.teamId,
    );
    if (!teamMember) return jsonFail(ApiCode.FORBIDDEN, "No permission");

    // Info: (20260322 - Luphia) 更新所有未完成的 ESG 紀錄
    const result = await esgRepo.verifyAllEsgRecords(accountBookId);

    return jsonOk({ count: result.count });
  } catch (error) {
    console.error("API Error:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to verify ESG records",
    );
  }
}
