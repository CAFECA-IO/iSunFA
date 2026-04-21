import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { paymentRepo } from "@/repositories/payment.repo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ payment_method_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { name, email, taxId, buyerName, billingAddress } =
      await request.json();

    const { payment_method_id: paymentMethodId } = await params;

    const paymentMethod =
      await paymentRepo.getPaymentMethodById(paymentMethodId);

    if (!paymentMethod || paymentMethod.userId !== user.id) {
      return jsonFail(API_ERRORS.NF_PAYMENT_METHOD);
    }

    const currentData = (paymentMethod.data as object) || {};
    await paymentRepo.updatePaymentMethodData(paymentMethodId, {
      ...currentData,
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(taxId !== undefined && { taxId }),
      ...(buyerName !== undefined && { buyerName }),
      ...(billingAddress !== undefined && { billingAddress }),
    });

    return jsonOk({ success: true });
  } catch (error) {
    console.error("[API] /user/payment_method/[id] PATCH error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ payment_method_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { payment_method_id: paymentMethodId } = await params;

    const paymentMethod =
      await paymentRepo.getPaymentMethodById(paymentMethodId);

    if (!paymentMethod || paymentMethod.userId !== user.id) {
      return jsonFail(API_ERRORS.NF_PAYMENT_METHOD);
    }

    const currentData = (paymentMethod.data as object) || {};
    // Info: (20260409 - Luphia) Soft delete to preserve transaction history links
    await paymentRepo.updatePaymentMethodData(paymentMethodId, {
      ...currentData,
      isDeleted: true,
    });

    return jsonOk({ success: true });
  } catch (error) {
    console.error("[API] /user/payment_method/[id] DELETE error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
