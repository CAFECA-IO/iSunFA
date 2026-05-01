import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { receiptRepo } from "@/repositories/receipt.repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { order_id: orderId } = await params;

    // Info: (20260410 - Luphia) Retrieve or dynamically create the receipt
    const receipt = await receiptRepo.getOrCreateReceipt(orderId);

    return jsonOk(receipt);
  } catch (error: unknown) {
    console.error("[API] /user/order/[order_id]/receipt GET error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return jsonFail({
      code: "IS000099",
      message: String(errorMessage).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
