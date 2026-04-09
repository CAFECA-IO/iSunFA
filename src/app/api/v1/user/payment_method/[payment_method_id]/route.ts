import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { paymentRepo } from "@/repositories/payment.repo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { payment_method_id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { name } = await request.json();

    if (typeof name !== "string") {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid name parameter");
    }

    const paymentMethod = await paymentRepo.getPaymentMethodById(
      params.payment_method_id
    );

    if (!paymentMethod || paymentMethod.userId !== user.id) {
      return jsonFail(ApiCode.NOT_FOUND, "Payment method not found");
    }

    const currentData = (paymentMethod.data as object) || {};
    await paymentRepo.updatePaymentMethodData(params.payment_method_id, {
      ...currentData,
      name,
    });

    return jsonOk({ success: true });
  } catch (error) {
    console.error("[API] /user/payment_method/[id] PATCH error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { payment_method_id: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const paymentMethod = await paymentRepo.getPaymentMethodById(
      params.payment_method_id
    );

    if (!paymentMethod || paymentMethod.userId !== user.id) {
      return jsonFail(ApiCode.NOT_FOUND, "Payment method not found");
    }

    const currentData = (paymentMethod.data as object) || {};
    // Info: (20260409 - Luphia) Soft delete to preserve transaction history links
    await paymentRepo.updatePaymentMethodData(params.payment_method_id, {
      ...currentData,
      isDeleted: true,
    });

    return jsonOk({ success: true });
  } catch (error) {
    console.error("[API] /user/payment_method/[id] DELETE error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
