import { NextRequest } from "next/server";
import { batchReactivateOrders } from "@/services/order.service";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260625 - Julian) 批量重啟訂單
 * POST /api/v1/admin/orders/batch_reactivate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const result = await batchReactivateOrders(orderIds);

    return jsonOk(
      result,
      `Batch reactivate completed. Success: ${result.successCount}, Fail: ${result.failCount}`,
    );
  } catch (error) {
    console.error("[API] Error batch reactivating orders:", error);

    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }

    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
