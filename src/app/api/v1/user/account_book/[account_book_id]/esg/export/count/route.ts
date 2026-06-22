import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ExportQuerySchema } from "@/validators/export";
import { exportService } from "@/services/export.service";
import { AppError } from "@/lib/utils/error";

/**
 * Info: (20260617 - Julian) 計算匯出 ESG 紀錄數
 * GET /api/v1/user/account_book/:account_book_id/esg/export/count
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

    const count = await exportService.countEsgForExport(
      sessionUser.id,
      accountBookId,
      startDate,
      endDate,
      includeUnverified,
    );

    return jsonOk({ count });
  } catch (error) {
    console.error("ESG export count failed:", error);
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
