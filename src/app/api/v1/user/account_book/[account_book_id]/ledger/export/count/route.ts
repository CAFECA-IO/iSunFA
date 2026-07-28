import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { LedgerQuerySchema } from "@/validators/ledger";
import { ledgerService } from "@/services/ledger.service";
import { mapServiceError } from "@/services/account_book_access.guard";

/**
 * Info: (20260727 - Julian) 計算分類帳匯出筆數
 * GET /api/v1/user/account_book/:account_book_id/ledger/export/count
 *
 * 純端口：驗 token → 驗參數 → 呼叫 LedgerService → 格式化回傳。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = LedgerQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      startAccountNo: searchParams.get("startAccountNo") ?? undefined,
      endAccountNo: searchParams.get("endAccountNo") ?? undefined,
      keyword: searchParams.get("keyword") ?? undefined,
      accountType: searchParams.get("accountType") ?? undefined,
      rootCode: searchParams.get("rootCode") ?? undefined,
      balanceOp: searchParams.get("balanceOp") ?? undefined,
      balanceValue: searchParams.get("balanceValue") ?? undefined,
      labelType: searchParams.get("labelType") ?? undefined,
      sorting: searchParams.get("sorting") ?? undefined,
    });
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_QUERY_PARAMETER_IS_REQUIRED);
    }

    const { account_book_id: accountBookId } = await params;
    const count = await ledgerService.getLedgerCount(
      accountBookId,
      sessionUser.id,
      parsed.data,
    );

    return jsonOk({ count });
  } catch (error) {
    console.error("Ledger export count failed", error);
    return jsonFail(mapServiceError(error));
  }
}
