import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { teamWalletLedgerQuerySchema } from "@/validators";
import { listTeamWalletLedgerByFilter } from "@/services/team_wallet_ledger.service";

/**
 * Info: (20260807 - Luphia) GET /api/v1/user/team/[team_id]/wallet/ledger（設計書 §7）：
 * OWNER / ADMIN 檢視 append-only 流水帳（分頁，createdAt 新到舊）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;
    const { searchParams } = new URL(request.url);
    const parsed = teamWalletLedgerQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

    // Info: (20261015 - Luphia) 選填 type 篩選（點數移轉紀錄頁）；未帶時委派原本的 listTeamWalletLedger
    const result = await listTeamWalletLedgerByFilter({
      userId: user.id,
      teamId,
      filter: parsed.data.type,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
    return jsonOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(API_ERRORS.TW_OPERATION_FAILED);
  }
}
