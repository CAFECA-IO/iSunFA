import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS } from "@/constants/status";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-oen-signature");
    const rawBody = await request.text();

    if (signature && process.env.PAYMENT_TOKEN) {
      const hmac = crypto.createHmac("sha256", process.env.PAYMENT_TOKEN);
      const computedSignature = hmac.update(rawBody).digest("hex");

      if (computedSignature !== signature) {
        console.error("[API] /payment/oen/webhook invalid signature");
        return jsonFail(ApiCode.FORBIDDEN, "Invalid signature");
      }
    } else if (!signature) {
      console.warn(
        "[API] /payment/oen/webhook missing signature header. Proceeding without validation (Not Recommended for Production)",
      );
    }

    const payload = JSON.parse(rawBody);
    console.log("[API] /payment/oen/webhook payload:", JSON.stringify(payload));
    const customId = payload.customId || payload.data?.customId;
    const status =
      payload.status ||
      payload.data?.status ||
      (payload.success ? "SUCCESS" : undefined);
    const transactionId =
      payload.transactionId ||
      payload.id ||
      payload.data?.id ||
      payload.data?.transactionId;

    if (!customId) {
      console.error("[API] /payment/oen/webhook missing customId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "Missing customId in webhook");
    }

    const isSuccess =
      status === "SUCCESS" ||
      payload.event === "payment.succeeded" ||
      payload.success === true;
    const isFailed =
      status === "FAILED" ||
      payload.event === "payment.failed" ||
      status === "CANCELLED";

    if (customId.startsWith("bind_")) {
      if (isSuccess) {
        const userId = customId.replace("bind_", "");
        const token =
          payload.token ||
          payload.data?.token ||
          payload.transactionId ||
          payload.data?.transactionId;

        if (token) {
          console.log(
            `[API] /payment/oen/webhook binding success for user ${userId}, saving token...`,
          );
          await prisma.user.update({
            where: { id: userId },
            data: { oenPaymentToken: token },
          });
        } else {
          console.error(
            `[API] /payment/oen/webhook binding success but no token received for user ${userId}`,
          );
        }
      } else {
        console.log(
          `[API] /payment/oen/webhook binding failed for user ${customId}`,
        );
      }
      return jsonOk({ message: "Bind webhook received" });
    }

    if (isSuccess) {
      const order = await prisma.order.findUnique({ where: { id: customId } });

      if (!order) {
        console.error(
          "[API] /payment/oen/webhook order not found for customId:",
          customId,
        );
        return jsonFail(ApiCode.NOT_FOUND, "Order not found");
      }

      if (order.status === ORDER_STATUS.PENDING) {
        const orderData = order.data as { credits: number; [key: string]: string | number | boolean | null | object | undefined };
        const credits = orderData?.credits;

        if (!credits) {
          console.error(
            "[API] /payment/oen/webhook order has no credits set in data:",
            order.id,
          );
          return jsonFail(
            ApiCode.INTERNAL_SERVER_ERROR,
            "Credits missing from order",
          );
        }

        const processingOrder = await prisma.order.updateMany({
          where: { id: customId, status: ORDER_STATUS.PENDING },
          data: {
            status: ORDER_STATUS.PROCESSING,
            data: { ...orderData, oenPaymentId: transactionId },
          },
        });

        if (processingOrder.count > 0) {
          const user = await prisma.user.findUnique({
            where: { id: order.userId },
          });
          if (user && user.address) {
            console.log(
              `[API] /payment/oen/webhook minting ${credits} tokens to ${user.address}`,
            );
            const mintResult = await mintToAddress(
              CONTRACT_ADDRESSES.NTD_TOKEN,
              user.address,
              credits,
            );

            if (mintResult.success) {
              const mintData = mintResult.data as { tx: string };
              await prisma.order.update({
                where: { id: customId },
                data: {
                  status: ORDER_STATUS.COMPLETED,
                  transactionHash: mintData?.tx as string,
                },
              });
            } else {
              console.error(
                "[API] /payment/oen/webhook minting failed:",
                mintResult.message,
              );
              await prisma.order.update({
                where: { id: customId },
                data: { status: ORDER_STATUS.MINT_FAILED },
              });
            }
          } else {
            console.error(
              "[API] /payment/oen/webhook user address not found for user:",
              order.userId,
            );
          }
        } else {
          console.log(
            "[API] /payment/oen/webhook order already processed concurrently:",
            customId,
          );
        }
      } else if (order.status === ORDER_STATUS.COMPLETED) {
        console.log("[API] /payment/oen/webhook already processed:", customId);
      }
    } else if (isFailed) {
      await prisma.order.updateMany({
        where: { id: customId, status: ORDER_STATUS.PENDING },
        data: {
          status: ORDER_STATUS.FAILED,
        },
      });
    }

    return jsonOk({ message: "Webhook received" });
  } catch (error) {
    console.error("[API] /payment/oen/webhook error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
