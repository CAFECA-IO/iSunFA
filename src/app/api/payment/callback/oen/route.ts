import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { IOenCallbackData, IOenOrderData } from "@/interfaces/payment";
import { ORDER_STATUS, PAYMENT_STATUS, ORDER_TYPE, PAYMENT_PROVIDER, PAYMENT_TRANSACTION_STATUS } from "@/constants/status";

export async function POST(request: NextRequest) {
    try {
        let bodyText = "";
        let body: IOenCallbackData;
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

        const { token } = body;
        const status =
            body.success ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED;

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
                    const rawBody = body as IOenCallbackData;
                    await tx.paymentMethod.create({
                        data: {
                            userId: order.userId,
                            provider: "OEN",
                            token: token,
                            data: (Object.keys(rawBody).length > 0 ? rawBody : Prisma.DbNull) as Prisma.InputJsonValue,
                        },
                    });
                }
            }

            const isPaymentSuccess = status === PAYMENT_STATUS.SUCCESS || body.success === true || (token && typeof token === "string");

            if (isPaymentSuccess && order.status === ORDER_STATUS.PENDING) {
                if (order.type === ORDER_TYPE.OEN_BINDING) {
                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            status: ORDER_STATUS.COMPLETED,
                            data: {
                                ...(order.data as IOenOrderData),
                            } as Prisma.InputJsonObject
                        },
                    });
                } else if (order.type === ORDER_TYPE.OEN_PAYMENT) {
                    const _creditsToMint = (order.data as IOenOrderData)?.credits || 0;
                    const dbReceipt = await tx.receipt.create({
                        data: {
                            orderId: order.id,
                            amount: order.amount,
                            data: {
                                ...(body),
                                receiptDetails: {
                                    amount: order.amount,
                                    credits: creditsToMint,
                                    transactionTime: new Date().toISOString(),
                                    buyerId: order.userId,
                                    buyerName: order.user?.name || "Unknown",
                                    itemDescription: `iSunFA Credits - ${_creditsToMint}`,
                                    gatewayTxId: body?.data?.id,
                                }
                            } as Prisma.InputJsonObject
                        }
                    });

                    await tx.paymentTransaction.updateMany({
                        where: { orderId: order.id },
                        data: { status: PAYMENT_TRANSACTION_STATUS.SUCCESS, rawData: body as unknown as Prisma.InputJsonValue }
                    });

                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            status: ORDER_STATUS.PAID,
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
            } else if (!isPaymentSuccess && order.status === ORDER_STATUS.PENDING) {
                await tx.paymentTransaction.updateMany({
                    where: { orderId: order.id },
                    data: { status: PAYMENT_TRANSACTION_STATUS.FAILED, rawData: body as unknown as Prisma.InputJsonValue, errorMessage: "Payment failed via OEN Callback" }
                });
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: ORDER_STATUS.FAILED,
                        data: { ...(order.data as IOenOrderData), checkoutResponse: body } as Prisma.InputJsonObject,
                    },
                });
            }
        });

        if (shouldMint && creditsToMint > 0) {
            const memo = JSON.stringify({ provider: PAYMENT_PROVIDER.OEN_CALLBACK, orderId: order.id, amount: amountPaid });
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
                        status: ORDER_STATUS.COMPLETED,
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
