import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IOenCheckoutRequest, IOenOrderData } from "@/interfaces/payment";
import { Prisma } from "@/generated/client";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { prisma } from "@/lib/prisma";

const OEN_ACCESS_TOKEN = process.env.OEN_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { amount, previousCredits, credits, paymentMethodId } = (await request.json()) as IOenCheckoutRequest;

    if (!amount || amount <= 0 || !credits || credits <= 0) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid amount or credits");
    }

    if (!paymentMethodId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "paymentMethodId is required");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { paymentMethods: true },
    });

    if (!dbUser) {
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const oenPaymentMethod = dbUser.paymentMethods.find((pm) => pm.id === paymentMethodId && pm.provider === "OEN");
    const providerToken = oenPaymentMethod?.token;

    if (!providerToken) {
      return jsonFail(ApiCode.NOT_FOUND, "Payment method not found or missing token");
    }

    const { order, paymentTransaction } = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: user.id,
          type: "OEN_PAYMENT",
          amount: amount,
          challenge: "N/A",
          data: {
            credits,
            amount,
            previousCredits,
          },
        },
      });

      const paymentTransaction = await tx.paymentTransaction.create({
        data: {
          userId: user.id,
          paymentMethodId: oenPaymentMethod.id,
          orderId: order.id,
          provider: "OEN",
          amount: amount,
          status: "PENDING",
        }
      });
      return { order, paymentTransaction };
    });

    const oenRes = await fetch(
      "https://payment-api.testing.oen.tw/token/transactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OEN_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          merchantId: "mermer",
          amount: amount,
          currency: "TWD",
          token: providerToken,
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

    if (oenData.code === "S0000" || oenRes.ok) {
      await prisma.$transaction(async (tx) => {
        const dbReceipt = await tx.receipt.create({
          data: {
            orderId: order.id,
            amount: amount,
            data: oenData
          }
        });
        await tx.paymentTransaction.update({
          where: { id: paymentTransaction.id },
          data: { status: "SUCCESS", rawData: oenData }
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            data: { ...(order.data as IOenOrderData), checkoutResponse: oenData, receiptId: dbReceipt.id } as Prisma.InputJsonObject,
          },
        });
      });

      const memo = JSON.stringify({ provider: "OEN", orderId: order.id, amount });
      const mintResult = await mintToAddress(CONTRACT_ADDRESSES.NTD_TOKEN, user.address, credits, memo);

      if (!mintResult.success) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "MINT_FAILED",
            data: { ...(order.data as object), oenResponse: oenData, error: mintResult.message },
          },
        });
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Payment succeeded but minting failed: " + mintResult.message);
      }

      const txHash = (mintResult.data as { tx: string })?.tx;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "COMPLETED",
          transactionHash: txHash,
        },
      });

      return jsonOk({
        requireBinding: false,
        success: true,
        txHash: txHash,
      });
    } else {
      await prisma.$transaction([
        prisma.paymentTransaction.update({
          where: { id: paymentTransaction.id },
          data: { status: "FAILED", rawData: oenData, errorMessage: "Payment failed via OEN" }
        }),
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: "FAILED",
            data: { ...(order.data as IOenOrderData), checkoutResponse: oenData } as Prisma.InputJsonObject,
          },
        })
      ]);
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Payment failed via OEN", oenData);
    }
  } catch {
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
