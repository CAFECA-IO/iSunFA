import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { Prisma } from "@/generated/client";

const OEN_TRANSACTION_TOKEN = process.env.OEN_TRANSACTION_TOKEN;

interface IOenCallbackPayload {
    customId?: string;
    token?: string;
    status?: string;
    success?: boolean;
    data?: {
        token?: string;
        status?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

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
        } catch (e) {
            console.error("[OEN Callback] Failed to parse payload:", e);
            return NextResponse.json(
                { message: "Invalid payload format" },
                { status: 400 },
            );
        }

        console.log(
            "[OEN Callback] Received payload:",
            JSON.stringify(body, null, 2),
        );

        let customId = body.customId;
        if (typeof customId === "string" && customId.startsWith("{")) {
            try {
                customId = JSON.parse(customId).orderId || customId;
            } catch { }
        }
        console.log(`[OEN Callback] Parsed customId (orderId): ${customId}`);


        const token = body.token || body.data?.token;
        const status =
            body.status || body.data?.status || body.success ? "SUCCESS" : "";
        console.log(
            `[OEN Callback] Extracted token: ${token ? "yes" : "no"}, status: ${status}`,
        );

        if (!customId) {
            console.error(`[OEN Callback] No customId provided in payload`);
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
            console.error(`[OEN Callback] Order not found for customId: ${customId}`);
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }
        console.log(
            `[OEN Callback] Found order: id=${order.id}, type=${order.type}, status=${order.status}, userId=${order.userId}`,
        );


        if (token && typeof token === "string") {
            await prisma.user.update({
                where: { id: order.userId },
                data: { oenToken: token },
            });
            console.log(`[OEN Callback] Saved token for user ${order.userId}`);
        }


        if (
            (status === "SUCCESS" ||
                body.success === true ||
                (token && typeof token === "string")) &&
            order.status === "PENDING" &&
            order.type === "OEN_BINDING"
        ) {
            const orderData = order.data as { credits?: number; amount?: number };
            console.log(
                `[OEN Callback] Processing successful binding for order ${order.id}, credits=${orderData.credits}, amount=${orderData.amount}`,
            );

            if (orderData.credits && orderData.amount && token) {

                console.log(
                    `[OEN Callback] Charging bound token for order ${order.id}...`,
                );


                const chargeOrder = await prisma.order.create({
                    data: {
                        userId: order.userId,
                        type: "OEN_PAYMENT",
                        amount: orderData.amount,
                        challenge: "N/A",
                        data: {
                            credits: orderData.credits,
                            amount: orderData.amount,
                            bindingOrderId: order.id,
                            oenToken: token,
                        },
                    },
                });
                console.log(
                    `[OEN Callback] Created OEN_PAYMENT chargeOrder: ${chargeOrder.id}`,
                );


                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: "COMPLETED" },
                });
                console.log(
                    `[OEN Callback] Marked binding order ${order.id} as COMPLETED`,
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
                            merchantId: process.env.OEN_MERCHANT_ID || "mermer",
                            amount: orderData.amount,
                            currency: "TWD",
                            token: token,
                            orderId: chargeOrder.id,
                            userName: order.user.name || "Unknown",
                            userEmail: `${order.user.id}@isunfa.tw`,
                            productDetails: [
                                {
                                    productionCode: "ISUNFA-CREDITS",
                                    description: `iSunFA Credits - ${orderData.credits}`,
                                    quantity: 1,
                                    unit: "pcs",
                                    unitPrice: orderData.amount,
                                },
                            ],
                        }),
                    },
                );

                const oenData = await oenRes.json();

                if (oenData.code === "S0000" || oenRes.ok) {
                    console.log(
                        `[OEN Callback] Charge successful for order ${chargeOrder.id}, proceeding to mint points.`,
                    );

                    const memo = JSON.stringify({
                        provider: "OEN",
                        orderId: chargeOrder.id,
                        amount: orderData.amount,
                    });
                    const mintResult = await mintToAddress(
                        CONTRACT_ADDRESSES.NTD_TOKEN,
                        order.user.address,
                        orderData.credits,
                        memo,
                    );

                    if (mintResult.success) {
                        const txHash = (mintResult.data as { tx: string })?.tx;
                        await prisma.order.update({
                            where: { id: chargeOrder.id },
                            data: {
                                status: "COMPLETED",
                                transactionHash: txHash,
                                data: {
                                    ...orderData,
                                    callbackBody: body as unknown as Prisma.InputJsonValue,
                                    chargeResponse: oenData,
                                },
                            },
                        });
                        console.log(
                            `[OEN Callback] Order ${chargeOrder.id} completed, minted ${orderData.credits} credits. txHash: ${txHash}`,
                        );
                    } else {
                        await prisma.order.update({
                            where: { id: chargeOrder.id },
                            data: {
                                status: "MINT_FAILED",
                                data: {
                                    ...orderData,
                                    callbackBody: body as unknown as Prisma.InputJsonValue,
                                    chargeResponse: oenData,
                                    error: mintResult.message,
                                },
                            },
                        });
                        console.error(
                            `[OEN Callback] Mint failed for order ${chargeOrder.id}: ${mintResult.message}`,
                        );
                    }
                } else {
                    console.error(
                        `[OEN Callback] Charge failed for order ${chargeOrder.id}:`,
                        oenData,
                    );
                    await prisma.order.update({
                        where: { id: chargeOrder.id },
                        data: {
                            status: "FAILED",
                            data: {
                                ...orderData,
                                callbackBody: body as unknown as Prisma.InputJsonValue,
                                chargeResponse: oenData,
                                error: "Charge failed via OEN",
                            },
                        },
                    });
                }
            } else if (!token) {
                console.log(
                    `[OEN Callback] No token received for order ${order.id}, cannot charge.`,
                );

            }
        }

        return NextResponse.json({ message: "OK" });
    } catch (error) {
        console.error("[OEN Callback] Error processing webhook:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
