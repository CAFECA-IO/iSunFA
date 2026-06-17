// Info: (20260617 - Julian) 傳票匯出數量計算 API Endpoint
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { ExportQuerySchema } from "@/validators/export";
import { exportService } from "@/services/export.service";

/**
 * Info: (20260617 - Julian) 計算匯出傳票數
 * GET /api/v1/user/account_book/:account_book_id/voucher/export/count
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { account_book_id: accountBookId } = await params;

    // Info: (20260617 - Julian) 檢查帳本是否存在
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);

    // Info: (20260617 - Julian) 檢查使用者是否有權限
    const teamMember = await teamRepo.getTeamMember(
      sessionUser.id,
      accountBook.teamId,
    );
    if (!teamMember) return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);

    // Info: (20260617 - Julian) 驗證查詢參數
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate") || undefined;
    const endDateStr = searchParams.get("endDate") || undefined;
    const includeUnverifiedStr =
      searchParams.get("includeUnverified") || undefined;

    const parseResult = ExportQuerySchema.safeParse({
      startDate: startDateStr,
      endDate: endDateStr,
      includeUnverified: includeUnverifiedStr,
    });
    if (!parseResult.success) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const { startDate, endDate, includeUnverified } = parseResult.data;

    const count = await exportService.countVouchersForExport(
      accountBookId,
      startDate,
      endDate,
      includeUnverified,
    );

    return jsonOk({ count });
  } catch (error) {
    console.error("Voucher export count failed:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
