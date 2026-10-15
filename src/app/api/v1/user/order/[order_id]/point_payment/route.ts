import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { pointPaymentSchema } from "@/validators";
import { payOrderWithPoints } from "@/services/point_payment.service";

/**
 * Info: (20261015 - Luphia) 以個人點數支付一張待付訂單（區塊鏈退役，取代 blockchain_payment）。
 *
 * body: `{ fido2Signature?: { authentication, challengeToken } }`
 * passkey 帳號必附（USER_ACTION 用途的 challengeToken 與對它的 assertion）；
 * 託管帳號免附。扣點、標 PAID、履行全在 point_payment.service。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> },
) {
  try {
    const user = await getIdentityFromDeWT(request.headers.get("Authorization"));
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { order_id: orderId } = await params;
    const parsed = pointPaymentSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);

    const result = await payOrderWithPoints({
      userId: user.id,
      orderId,
      fido2Signature: parsed.data.fido2Signature,
    });

    return jsonOk(result);
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    console.error("[API] POST point_payment Error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
