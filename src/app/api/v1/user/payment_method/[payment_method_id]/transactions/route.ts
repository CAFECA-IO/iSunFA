import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { paymentRepo } from "@/repositories/payment.repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payment_method_id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { payment_method_id: paymentMethodId } = await params;

    // Info: (20260409 - Luphia) Securely fetch transactions with matching userId
    const transactions = await paymentRepo.getPaymentTransactionsByPaymentMethodId(
      paymentMethodId,
      user.id
    );

    return jsonOk({ transactions });
  } catch (error) {
    console.error("[API] /user/payment_method/[id]/transactions GET error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
