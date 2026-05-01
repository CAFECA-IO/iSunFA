import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { paymentRepo } from "@/repositories/payment.repo";
import { ORDER_STATUS } from "@/constants/status";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> },
) {
  try {
    // Info: (20260302 - Tzuhan) [流程 4-1: 獲取身分驗證資訊] 從 Header 中取得 DeWT Token 並解析出使用者資訊
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const orderId = (await params).order_id;

    if (!orderId) {
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    // Info: (20260302 - Tzuhan) [流程 4-2: 查詢訂單資料] 從資料庫撈取特定訂單並檢查是否屬於該使用者
    const order = await paymentRepo.getOrderByIdAndUserId(orderId, user.id);

    if (!order) {
      return jsonFail(API_ERRORS.NF_ORDER);
    }

    // Info: (20260302 - Tzuhan) [流程 4-3: 判斷失敗狀態並附帶錯誤] 如果狀態是失敗，嘗試從其 data 欄位把詳細的 Error 摘要帶回前端
    let errorMessage = null;
    if (
      order.status === ORDER_STATUS.FAILED ||
      order.status === ORDER_STATUS.MINT_FAILED ||
      order.status === ORDER_STATUS.PAYMENT_FAILED
    ) {
      errorMessage =
        (order.data as { error?: string })?.error ||
        "Payment processing failed";
    }

    // Info: (20260302 - Tzuhan) [流程 4-4: 回傳訂單狀態] 讓前端決定是否繼續輪詢或是轉換 UI 頁面 (前往成功或失敗)
    return jsonOk({
      id: order.id,
      status: order.status,
      transactionHash: order.transactionHash,
      errorMessage,
      data: order.data,
    });
  } catch (error) {
    console.error(
      "Deprecate: (20260310 - Tzuhan) ",
      "[API] GET /user/order/[id] error:",
      error,
    );
    return jsonFail({
      code: "IN000099",
      message: "Failed to fetch order details",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
