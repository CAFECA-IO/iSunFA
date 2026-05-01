import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Prisma } from "@/generated/client";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { paymentRepo } from "@/repositories/payment.repo";
import { ORDER_TYPE } from "@/constants/status";
import { isProduction } from "@/lib/utils/common";
import { CURRENCY_UNIT } from "@/constants/price";

const OEN_ACCESS_TOKEN = process.env.OEN_ACCESS_TOKEN;
const OEN_BASE_URL = isProduction()
  ? "https://payment-api.oen.tw"
  : "https://payment-api.testing.oen.tw";
const SUBSCRIBE_URL = isProduction()
  ? "https://mermer.oen.tw"
  : "https://mermer.testing.oen.tw";

// Info: (20260305 - Tzuhan) Get all payment methods for the user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const paymentMethods = await paymentRepo.getPaymentMethodsByUserId(
      user.id,
      "OEN",
    );

    return jsonOk({
      paymentMethods: paymentMethods.map((pm) => ({
        ...pm,
        createdAt: pm.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[API] /user/payment_method GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

// Info: (20260305 - Tzuhan) Bind a new credit card via OEN
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const order = await paymentRepo.createOrder({
      userId: user.id,
      type: ORDER_TYPE.OEN_BINDING,
      amount: 0,
      unit: CURRENCY_UNIT.TWD,
      challenge: "N/A",
      data: {
        credits: 0,
        amount: 0,
      },
    });

    const originBase = request.nextUrl.origin;
    const webhookBase = process.env.NEXT_PUBLIC_APP_URL || originBase;
    const fetchUrl = `${OEN_BASE_URL}/checkout-token`;
    const fetchQuery = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OEN_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        merchantId: "mermer",
        // Info: (20260305 - Tzuhan) 綁定成功後，OEN 將用戶導回前台
        successUrl: `${webhookBase}/pricing?tab=credits&binding_success=true&order_id=${order.id}`,
        failureUrl: `${webhookBase}/pricing?tab=credits&binding_failure=true&order_id=${order.id}`,
        customId: order.id,
        callbackUrl: `${webhookBase}/api/payment/callback/oen`,
      }),
    };

    const oenRes = await fetch(fetchUrl, fetchQuery);

    const oenData = await oenRes.json();

    if (oenData.code === "S0000" && oenData.data?.id) {
      const paymentId = oenData.data.id;

      await paymentRepo.updateOrderData(order.id, {
        paymentId: paymentId,
      } as Prisma.InputJsonObject);

      return jsonOk({
        requireBinding: true,
        paymentId: paymentId,
        redirectUrl: `${SUBSCRIBE_URL}/checkout/subscription/create/${paymentId}`,
      });
    } else {
      return jsonFail(
        {
          code: "IN000099",
          message: "Failed to get OEN checkout ...",
          status: ApiCode.INTERNAL_SERVER_ERROR,
        },
        oenData,
      );
    }
  } catch {
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
