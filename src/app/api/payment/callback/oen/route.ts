import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

import { IOenCallbackPayload, IOenCallbackData, IOenOrderData } from "@/interfaces/payment";
import { ORDER_STATUS } from "@/constants/status";

export async function POST(request: NextRequest) {
    try {
        let bodyText = "";
        let body: IOenCallbackPayload = {};
        try {
            if (
                request.headers
                    .get("content-type")
                    ?.includes("application/x-www-form-urlencoded")
            ) {
                const formData = await request.formData();
                bodyText = JSON.stringify(Object.fromEntries(formData.entries()));
                body = Object.fromEntries(formData.entries());
            } else {
                bodyText = await request.text();
                body = JSON.parse(bodyText);
            }
        } catch (err) {
            console.warn("Deprecate: (20260310 - Tzuhan) ", "[OEN Callback] Failed to parse payload:", err);
            return NextResponse.json(
                { message: "Invalid payload format" },
                { status: 400 },
            );
        }

        let customId = body.customId;
        if (typeof customId === "string" && customId.startsWith("{")) {
            try {
                customId = JSON.parse(customId).orderId || customId;
            } catch (err) {
                console.warn("Deprecate: (20260310 - Tzuhan) ", "[OEN Callback] Failed to parse customId as JSON:", err);
            }
        }

        const token = body.token || body.data?.token;
        const status =
            body.status || body.data?.status || body.success ? "SUCCESS" : "";

        if (!customId) {
            return NextResponse.json(
                { message: "No customId provided" },
                { status: 400 },
            );
        }

        const order = await prisma.order.findUnique({
            where: { id: customId },
            include: { user: true },
        });

        if (!order) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }



        let shouldMint = false;
        let creditsToMint = 0;
        let amountPaid = 0;

        await prisma.$transaction(async (tx) => {
            if (token && typeof token === "string") {
                const existingMethod = await tx.paymentMethod.findFirst({
                    where: {
                        userId: order.userId,
                        provider: "OEN",
                        token: token,
                    }
                });

                if (!existingMethod) {
                    const rawBody = body as Record<string, unknown>;
                    const mergedData: IOenCallbackData = body.data ? { ...body.data } : {};

                    if (rawBody.card4no) mergedData.card4no = String(rawBody.card4no);
                    if (rawBody.cardBrand) mergedData.cardBrand = String(rawBody.cardBrand);
                    if (rawBody.issuer) mergedData.issuer = String(rawBody.issuer);

                    await tx.paymentMethod.create({
                        data: {
                            userId: order.userId,
                            provider: "OEN",
                            token: token,
                            data: (Object.keys(mergedData).length > 0 ? mergedData : Prisma.DbNull) as Prisma.InputJsonValue,
                        },
                    });
                }
            }

            const isPaymentSuccess = status === "SUCCESS" || body.success === true || (token && typeof token === "string");

            if (isPaymentSuccess && order.status === "PENDING") {
                if (order.type === "OEN_BINDING") {
                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            status: "COMPLETED",
                            data: {
                                ...(order.data as IOenOrderData),
                                card4no: String((body.data?.card4no || body.card4no || "")) || undefined,
                                issuer: String((body.data?.issuer || body.issuer || "")) || undefined,
                            } as Prisma.InputJsonObject
                        },
                    });
                } else if (order.type === "OEN_PAYMENT") {
                    const dbReceipt = await tx.receipt.create({
                        data: {
                            orderId: order.id,
                            amount: order.amount,
                            data: body as unknown as Prisma.InputJsonValue
                        }
                    });

                    await tx.paymentTransaction.updateMany({
                        where: { orderId: order.id },
                        data: { status: "SUCCESS", rawData: body as unknown as Prisma.InputJsonValue }
                    });

                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            status: "PAID",
                            data: {
                                ...(order.data as IOenOrderData),
                                checkoutResponse: body,
                                receiptId: dbReceipt.id
                            } as Prisma.InputJsonObject,
                        },
                    });

                    shouldMint = true;
                    creditsToMint = (order.data as IOenOrderData)?.credits || 0;
                    amountPaid = order.amount;
                }
            } else if (!isPaymentSuccess && order.status === "PENDING") {
                await tx.paymentTransaction.updateMany({
                    where: { orderId: order.id },
                    data: { status: "FAILED", rawData: body as unknown as Prisma.InputJsonValue, errorMessage: "Payment failed via OEN Callback" }
                });
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: "FAILED",
                        data: { ...(order.data as IOenOrderData), checkoutResponse: body } as Prisma.InputJsonObject,
                    },
                });
            }
        });

        if (shouldMint && creditsToMint > 0) {
            const memo = JSON.stringify({ provider: "OEN_CALLBACK", orderId: order.id, amount: amountPaid });
            const mintResult = await mintToAddress(CONTRACT_ADDRESSES.NTD_TOKEN, order.user.address, creditsToMint, memo);

            if (!mintResult.success) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        status: ORDER_STATUS.MINT_FAILED,
                        data: { ...(order.data as object), oenResponse: body, error: mintResult.message },
                    },
                });
                // We don't return 500 here because the webhook itself is technically processed successfully up to minting.
            } else {
                const txHash = (mintResult.data as { tx: string })?.tx;

                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        status: "COMPLETED",
                        transactionHash: txHash,
                    },
                });
            }
        }

        return NextResponse.json({ message: "OK" });
    } catch (err) {
        console.warn("Deprecate: (20260310 - Tzuhan) ", "[OEN Callback] Error processing webhook:", err);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
