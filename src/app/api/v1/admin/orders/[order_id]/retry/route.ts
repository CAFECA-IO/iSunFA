import { NextRequest } from "next/server";
import { retryFailedOrder } from "@/services/order.service";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ order_id: string }> },
) {
  try {
    const { order_id: orderId } = await props.params;

    if (!orderId) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    await retryFailedOrder(orderId);

    return jsonOk(
      { success: true },
      "Order has been reset to PAID and queued for execution.",
    );
  } catch (error) {
    console.error("[API] Error retrying order:", error);

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
