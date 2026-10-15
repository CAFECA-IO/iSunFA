import {
  calculateLogisticsPlan,
  calculateLogisticsPlanFromText,
} from "@/services/route.service";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { ORDER_STATUS } from "@/constants/status";
import { isPostPaymentOrderStatus } from "@/constants/point_payment";
import { getOrderById, updateOrderStatus } from "@/services/order.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "parse") {
      if (!body.text) {
        return jsonFail({
          ...API_ERRORS.VL_MISSING_PARAMS,
          message: "Please provide transportation text.",
        });
      }
      const data = await calculateLogisticsPlanFromText(body.text);
      return jsonOk(data);
    } else if (body.action === "calculate") {
      // Info: (20260430 - Luphia) Step 2: Calculate Plan Only
      if (
        body.originLat === undefined ||
        body.originLng === undefined ||
        body.destLat === undefined ||
        body.destLng === undefined
      ) {
        return jsonFail({
          ...API_ERRORS.VL_MISSING_PARAMS,
          message: "Missing coordinates.",
        });
      }

      // Info: (20260501 - Luphia) Verify Payment
      const authHeader = request.headers.get("Authorization");
      const user = await getIdentityFromDeWT(authHeader);
      if (!user) {
        return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
      }

      if (!body.orderId) {
        return jsonFail({
          ...API_ERRORS.VL_MISSING_PARAMS,
          message: "Missing orderId. Payment verification required.",
        });
      }

      const order = await getOrderById(body.orderId);
      if (!order || order.userId !== user.id) {
        return jsonFail({
          ...API_ERRORS.VL_MISSING_PARAMS,
          message: "Invalid order.",
        });
      }

      /**
       * Info: (20261015 - Luphia) 不再接受 PAYING（區塊鏈退役）：那是鏈上付款在途的舊狀態，
       * 鏈已損毀、無從確認是否真的扣到。付款後狀態的判準與付款端同源。
       */
      if (!isPostPaymentOrderStatus(order.status)) {
        return jsonFail({
          ...API_ERRORS.VL_MISSING_PARAMS,
          message: "Order payment is not completed.",
        });
      }

      // Info: (20260501 - Luphia) Consume the order to prevent reuse
      if (order.status !== ORDER_STATUS.COMPLETED) {
        await updateOrderStatus(order.id, ORDER_STATUS.COMPLETED);
      }

      const plan = await calculateLogisticsPlan(
        Number(body.originLat),
        Number(body.originLng),
        Number(body.destLat),
        Number(body.destLng),
        String(body.weightKg || 1000),
      );
      return jsonOk(plan);
    } else {
      // Info: (20260430 - Luphia) Legacy / External API Flow: Do both steps automatically
      if (!body.text) {
        return jsonFail({
          ...API_ERRORS.VL_MISSING_PARAMS,
          message: "Please provide transportation text.",
        });
      }
      const { plan } = await calculateLogisticsPlanFromText(
        body.text,
        body.weight,
      );

      return jsonOk(plan);
    }
  } catch (error) {
    console.error("Error in transportation calculator API:", error);
    return jsonFail({
      ...API_ERRORS.IS_UNKNOWN,
      message:
        error instanceof Error ? error.message : "Failed to process request.",
    });
  }
}
