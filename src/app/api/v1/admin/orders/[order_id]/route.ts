import { updateOrderStatus } from "@/services/order.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

export async function PATCH(
  request: Request,
  { params }: { params: { order_id: string } },
) {
  try {
    const { order_id: orderId } = params;
    const { status } = await request.json();

    if (!status) {
      return jsonFail(API_ERRORS.VA_STATUS_IS_REQUIRED);
    }

    const updatedOrder = await updateOrderStatus(orderId, status);

    return jsonOk(updatedOrder);
  } catch (error) {
    console.error("Failed to update order status:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
