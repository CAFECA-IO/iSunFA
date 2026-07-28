import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { LedgerQuerySchema } from "@/validators/ledger";
import { ledgerService } from "@/services/ledger.service";
import { mapServiceError } from "@/services/account_book_access.guard";

/**
 * Info: (20260727 - Julian) 取得分類帳 (Ledger)
 * GET /api/v1/user/account_book/:account_book_id/ledger
 *   ?startDate={ISO}&endDate={ISO}&startAccountNo=&endAccountNo=&labelType=&sorting=&page=&pageSize=
 *
 * 純端口：驗 token → 驗參數 → 呼叫 LedgerService → 格式化回傳。授權與業務邏輯下沉 Service。
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

    // Info: (20260728 - Julian) 端口職責：參數驗證（集中式 Zod Schema）
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
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_QUERY_PARAMETER_IS_REQUIRED);
    }

    const { account_book_id: accountBookId } = await params;
    const result = await ledgerService.getLedger(
      accountBookId,
      sessionUser.id,
      parsed.data,
    );
    return jsonOk(result);
  } catch (error) {
    console.error("Get ledger failed", error);
    return jsonFail(mapServiceError(error));
  }
}
