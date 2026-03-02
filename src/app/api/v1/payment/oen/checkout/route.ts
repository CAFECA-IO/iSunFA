import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { prisma } from "@/lib/prisma";

const OEN_ACCESS_TOKEN = process.env.OEN_ACCESS_TOKEN;
const OEN_TRANSACTION_TOKEN = process.env.OEN_TRANSACTION_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { amount, credits, useSavedCard } = await request.json();
    console.log(
      `[OEN Checkout] Request received: amount=${amount}, credits=${credits}, useSavedCard=${useSavedCard}, userId=${user.id}`,
    );

    if (!amount || amount <= 0 || !credits || credits <= 0) {
      console.error("[OEN Checkout] Invalid amount or credits");
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid amount or credits");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { paymentMethods: true },
    });

    if (!dbUser) {
      console.error(`[OEN Checkout] User not found in DB: ${user.id}`);
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }
    const oenPaymentMethod = dbUser.paymentMethods.find((pm) => pm.provider === "OEN");
    const oenToken = oenPaymentMethod?.token;

    console.log(
      `[OEN Checkout] User fetched from DB: hasTokens=${!!oenToken}`,
    );

    if (useSavedCard && oenToken) {
      console.log(`[OEN Checkout] Flow: Directly charge using saved token`);

      const order = await prisma.order.create({
        data: {
          userId: user.id,
          type: "OEN_PAYMENT",
          amount: amount,
          challenge: "N/A",
          data: {
            credits,
            amount,
            oenToken: oenToken,
          },
        },
      });
      console.log(`[OEN Checkout] Created pending payment order: ${order.id}`);

      console.log(
        `[OEN Checkout] Calling OEN /token/transactions API: amount=${amount}, email=${dbUser.id}@isunfa.tw`,
      );

      const oenRes = await fetch(
        "https://payment-api.testing.oen.tw/token/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OEN_TRANSACTION_TOKEN}`,
          },
          body: JSON.stringify({
            merchantId: "mermer",
            amount: amount,
            currency: "TWD",
            token: oenToken,
            orderId: order.id,
            userName: dbUser.name || "Unknown",
            userEmail: `${dbUser.id}@isunfa.tw`,
            productDetails: [
              {
                productionCode: "ISUNFA-CREDITS",
                description: `iSunFA Credits - ${credits}`,
                quantity: 1,
                unit: "pcs",
                unitPrice: amount,
              },
            ],
          }),
        },
      );

      const oenData = await oenRes.json();
      console.log(
        `[OEN Checkout] OEN /token/transactions response: status=${oenRes.status}`,
        JSON.stringify(oenData),
      );

      if (oenData.code === "S0000" || oenRes.ok) {
        console.log(
          `[OEN Checkout] Charge successful, proceeding to mint ${credits} credits to ${user.address}...`,
        );

        const memo = JSON.stringify({
          provider: "OEN",
          orderId: order.id,
          amount,
        });
        const mintResult = await mintToAddress(
          CONTRACT_ADDRESSES.NTD_TOKEN,
          user.address,
          credits,
          memo,
        );
        console.log(
          `[OEN Checkout] Mint result: success=${mintResult.success}, message=${mintResult.message}`,
        );

        if (!mintResult.success) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "MINT_FAILED",
              data: {
                ...(order.data as object),
                oenResponse: oenData,
                error: mintResult.message,
              },
            },
          });
          return jsonFail(
            ApiCode.INTERNAL_SERVER_ERROR,
            "Payment succeeded but minting failed: " + mintResult.message,
          );
        }

        const txHash = (mintResult.data as { tx: string })?.tx;

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "COMPLETED",
            transactionHash: txHash,
            data: { ...(order.data as object), oenResponse: oenData },
          },
        });
        console.log(
          `[OEN Checkout] Order ${order.id} COMPLETED with txHash: ${txHash}`,
        );

        return jsonOk({
          requireBinding: false,
          success: true,
          txHash: txHash,
        });
      } else {
        console.error(`[OEN Checkout] Charge failed via OEN`);
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "FAILED",
            data: { ...(order.data as object), oenResponse: oenData },
          },
        });
        return jsonFail(
          ApiCode.INTERNAL_SERVER_ERROR,
          "Payment failed via OEN",
          oenData,
        );
      }
    } else {
      console.log(`[OEN Checkout] Flow: No token or wants to bind a new card`);

      const order = await prisma.order.create({
        data: {
          userId: user.id,
          type: "OEN_BINDING",
          amount: amount,
          challenge: "N/A",
          data: {
            credits,
            amount,
          },
        },
      });

      const hostUrl = request.headers.get("host") || "localhost:3000";
      const protocol = hostUrl.includes("localhost") ? "http" : "https";
      const originBase = `${protocol}://${hostUrl}`;

      const webhookBase = process.env.NEXT_PUBLIC_APP_URL || originBase;

      console.log(`[OEN Checkout] webhookBase: ${webhookBase}`);

      const oenRes = await fetch(
        "https://payment-api.testing.oen.tw/checkout-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OEN_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            merchantId: "mermer",
            successUrl: `${originBase}/pricing?tab=credits&payment_success=true&order_id=${order.id}&amount=${amount}&credits=${credits}`,
            failureUrl: `${originBase}/pricing?tab=credits&payment_failure=true&order_id=${order.id}`,
            customId: order.id,
            callbackUrl: `${webhookBase}/api/payment/callback/oen`,
          }),
        },
      );

      const oenData = await oenRes.json();
      console.log(
        `[OEN Checkout] OEN /checkout-token response: status=${oenRes.status}`,
        JSON.stringify(oenData),
      );

      if (oenData.code === "S0000" && oenData.data?.id) {
        const paymentId = oenData.data.id;
        console.log(
          `[OEN Checkout] Received checkout-token paymentId: ${paymentId}`,
        );

        await prisma.order.update({
          where: { id: order.id },
          data: { data: { ...(order.data as object), paymentId: paymentId } },
        });

        return jsonOk({
          requireBinding: true,
          paymentId: paymentId,
          redirectUrl: `https://mermer.testing.oen.tw/checkout/subscription/create/${paymentId}`,
        });
      } else {
        console.error(`[OEN Checkout] Failed to get OEN checkout token`);
        return jsonFail(
          ApiCode.INTERNAL_SERVER_ERROR,
          "Failed to get OEN checkout token",
          oenData,
        );
      }
    }
  } catch (error) {
    console.error("[API] /payment/oen/checkout error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
