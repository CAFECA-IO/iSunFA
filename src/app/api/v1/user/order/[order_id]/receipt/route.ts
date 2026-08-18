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

    /**
     * Info: (20260815 - Luphia) 收據一律限於**自己的訂單**（PR #6652 第二輪 §E）。
     *
     * 原本只檢查有沒有登入，任何登入者換一個 order_id 就能取得他人的收據
     * （金額、買方姓名、buyerId）。查無與無權一律回同一個 404，
     * 不讓回應差異透露「這張訂單存在」。
     */
    const receipt = await receiptRepo.getOrCreateReceipt(
      orderId,
      sessionUser.id,
    );
    if (!receipt) {
      return jsonFail(API_ERRORS.NF_ORDER);
    }

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
