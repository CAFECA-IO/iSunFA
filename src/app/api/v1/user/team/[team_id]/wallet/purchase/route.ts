import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { teamWalletPurchaseSchema } from "@/validators";
import { createTeamPointPurchaseOrder } from "@/services/team_wallet.service";

/**
 * Info: (20260807 - Luphia) POST /api/v1/user/team/[team_id]/wallet/purchase（設計書 §6.1）：
 * OWNER / ADMIN 建立 BILLING_TEAM_POINT 訂單，回傳 orderId + challenge，
 * 後續走既有 payment_method/[id]/checkout 綁卡扣款，付款成功自動入池。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;
    const parsed = teamWalletPurchaseSchema.safeParse(await request.json());
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

    const result = await createTeamPointPurchaseOrder({
      userId: user.id,
      teamId,
      creditPlanId: parsed.data.creditPlanId,
      paymentMethodId: parsed.data.paymentMethodId,
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
