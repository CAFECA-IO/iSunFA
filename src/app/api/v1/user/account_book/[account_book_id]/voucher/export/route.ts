import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonFail, fileOk } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ExportQuerySchema } from "@/validators/export";
import { exportService } from "@/services/export.service";
import { AppError } from "@/lib/utils/error";

/**
 * Info: (20260617 - Julian) 匯出傳票 CSV
 * GET /api/v1/user/account_book/:account_book_id/voucher/export
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

    const csvContent = await exportService.exportVouchersToCsv(
      sessionUser.id,
      accountBookId,
      startDate,
      endDate,
      includeUnverified,
    );

    // Info: (20260617 - Julian) 加入 UTF-8 BOM，防止 Excel 開啟 CSV 時中文顯示亂碼
    const BOM = "\uFEFF";
    const body = BOM + csvContent;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    return fileOk(body, `vouchers_${dateStr}.csv`, "text/csv; charset=utf-8");
  } catch (error) {
    console.error("Voucher export failed:", error);
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
