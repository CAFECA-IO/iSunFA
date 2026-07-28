import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ReportQuerySchema } from "@/validators/report";
import { reportService } from "@/services/report.service";
import { mapServiceError } from "@/services/account_book_access.guard";

/**
 * Info: (20260330 - Julian) 取得財務報表
 * GET /api/v1/user/account_book/:account_book_id/report?reportType={ReportType}&period={ReportPeriod}&year=&sorting=
 *
 * 純端口：驗 token → 驗參數 → 呼叫 ReportService → 格式化回傳。授權與業務邏輯下沉 Service。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260728 - Julian) 端口職責：解析身分（token）
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260728 - Julian) 端口職責：參數驗證（集中式 Zod Schema，取代未驗證的 as 斷言）
    const searchParams = request.nextUrl.searchParams;
    const parsed = ReportQuerySchema.safeParse({
      reportType: searchParams.get("reportType") ?? undefined,
      period: searchParams.get("period") ?? undefined,
      year: searchParams.get("year") ?? undefined,
      sorting: searchParams.get("sorting") ?? undefined,
    });
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_QUERY_PARAMETER_IS_REQUIRED);
    }

    const { account_book_id: accountBookId } = await params;
    const result = await reportService.getReport(
      accountBookId,
      sessionUser.id,
      parsed.data,
    );
    return jsonOk(result);
  } catch (error) {
    console.error("Get report failed", error);
    return jsonFail(mapServiceError(error));
  }
}
