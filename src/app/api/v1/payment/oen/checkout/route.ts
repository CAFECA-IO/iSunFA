import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS } from "@/constants/status";
import { chargeCreditCardToken } from "@/services/oen.service";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { amount, credits } = await request.json();

    if (!credits || credits <= 0 || amount === undefined || amount < 0) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid payment details");
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        type: "CREDIT_PURCHASE",
        amount: amount,
        status: ORDER_STATUS.PENDING,
        challenge: `mock_challenge_${Date.now()}`,
        data: {
          credits,
        },
      },
    });

    if (user.oenPaymentToken) {
      try {
        const productDetails = [
          {
            productionCode: "CREDITS",
            description: `Credits Purchase`,
            quantity: 1,
            unit: "次",
            unitPrice: amount,
          },
        ];

        console.log(
          `[API] /payment/oen/checkout: Charging via bound token for user ${user.id}`,
        );
        const responseData = await chargeCreditCardToken(
          user,
          order.id,
          amount,
          productDetails,
        );
        console.log(
          `[API] /payment/oen/checkout: Charge successful, minting ${credits} tokens...`,
        );
        const mintResult = await mintToAddress(
          CONTRACT_ADDRESSES.NTD_TOKEN,
          user.address,
          credits,
        );

        let finalStatus: string = ORDER_STATUS.COMPLETED;
        let txHash = undefined;

        if (mintResult.success) {
          txHash = (mintResult.data as { tx: string })?.tx;
        } else {
          finalStatus = ORDER_STATUS.MINT_FAILED;
          console.error(
            "[API] /payment/oen/checkout: token charged but minting failed:",
            mintResult.message,
          );
        }

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: finalStatus,
            data: {
              ...(typeof order.data === "object" && order.data !== null
                ? order.data
                : {}),
              oenPaymentId: responseData.data?.id || responseData.id,
            },
            transactionHash: txHash,
          },
        });

        return jsonOk({
          orderId: order.id,
          oenResponse: { action: "CHARGED", finalStatus, txHash },
        });
      } catch (chargeError) {
        console.error(
          "[API] /payment/oen/checkout background charge failed:",
          chargeError,
        );
      }
    }

    const oenApiUrl = "https://payment-api.testing.oen.tw/checkout-token";
    const merchantId = process.env.OEN_MERCHANT_ID;
    const paymentToken = process.env.OEN_PAYMENT_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const paymentBody = {
      merchantId,
      amount: amount,
      currency: "TWD",
      orderId: order.id,
      customId: order.id,
      successUrl: `${appUrl}/api/v1/payment/oen/callback?orderId=${order.id}&status=success&tab=credits`,
      failureUrl: `${appUrl}/api/v1/payment/oen/callback?orderId=${order.id}&status=failed&tab=credits`,
      productDetails: [
        {
          productionCode: "CREDITS",
          description: `Credits Purchase`,
          quantity: 1,
          unit: "次",
          unitPrice: amount,
        },
      ],
    };

    console.log("[API] /payment/oen/checkout requesting Oen API:", paymentBody);

    const response = await fetch(oenApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${paymentToken}`,
      },
      body: JSON.stringify(paymentBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[API] /payment/oen/checkout API error:",
        response.status,
        errorText,
      );
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Failed to create payment session",
      );
    }

    const responseData = await response.json();

    if (!responseData.success && !responseData.id && !responseData.data?.id) {
      console.error(
        "[API] /payment/oen/checkout business error:",
        responseData,
      );
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Failed to initialize payment",
      );
    }

    const id = responseData.data?.id;

    const paymentUrl = `https://${merchantId}.testing.oen.tw/checkout/subscription/create/${id}`;

    return jsonOk({
      orderId: order.id,
      oenResponse: { paymentUrl },
    });
  } catch (error) {
    console.error("[API] /payment/oen/checkout error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
