import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { Prisma } from "@/generated/client";

const OEN_TRANSACTION_TOKEN = process.env.OEN_TRANSACTION_TOKEN;

import { IOenCallbackPayload, IOenCallbackData, IOenOrderData } from "@/interfaces/payment";

export async function POST(request: NextRequest) {
    try {
        // Info: (20260302 - Tzuhan) [流程 4-1: 接收應援科技(OEN) Webhook] 使用者在 OEN 結帳頁面完成綁卡/授權後，OEN 伺服器會在背景呼叫此 API (Callback) 傳遞結果
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
            console.error("Deprecate: (20260310 - Tzuhan) ", "[OEN Callback] Failed to parse payload:", e);
            return NextResponse.json(
                { message: "Invalid payload format" },
                { status: 400 },
            );
        }

        console.log("Deprecate: (20260310 - Tzuhan) ", "[OEN Callback] Received payload:",
            JSON.stringify(body, null, 2),
        );

        let customId = body.customId;
        if (typeof customId === "string" && customId.startsWith("{")) {
            try {
                customId = JSON.parse(customId).orderId || customId;
            } catch (e) {
                console.warn("Deprecate: (20260310 - Tzuhan) ", "[OEN Callback] Failed to parse customId as JSON:", e);
            }
        }
        console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Parsed customId (orderId): ${customId}`);


        const token = body.token || body.data?.token;
        const status =
            body.status || body.data?.status || body.success ? "SUCCESS" : "";
        console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Extracted token: ${token ? "yes" : "no"}, status: ${status}`,
        );

        if (!customId) {
            console.error("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] No customId provided in payload`);
            return NextResponse.json(
                { message: "No customId provided" },
                { status: 400 },
            );
        }

        // Info: (20260302 - Tzuhan) [流程 4-2: 找出對應訂單] 透過 OEN 回傳的 customId (對應我們自己的 order.id) 尋找 PENDING 狀態的 OEN_BINDING 訂單
        const order = await prisma.order.findUnique({
            where: { id: customId },
            include: { user: true },
        });

        if (!order) {
            console.error("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Order not found for customId: ${customId}`);
            return NextResponse.json({ message: "Order not found" }, { status: 404 });
        }
        console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Found order: id=${order.id}, type=${order.type}, status=${order.status}, userId=${order.userId}`,
        );


        let paymentMethodId: string | undefined;

        if (token && typeof token === "string") {
            // Info: (20260302 - Tzuhan) [流程 4-3: 儲存信用卡 Token] 如果回傳內容包含 token，表示綁卡成功，將此 token 存入 PaymentMethod，未來即可進行免跳轉的直接扣款
            const existingMethod = await prisma.paymentMethod.findFirst({
                where: {
                    userId: order.userId,
                    provider: "OEN",
                    token: token,
                }
            });

            if (existingMethod) {
                paymentMethodId = existingMethod.id;
                console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Token already exists for user ${order.userId}`);
            } else {
                const rawBody = body as Record<string, unknown>;
                const mergedData: IOenCallbackData = body.data ? { ...body.data } : {};

                if (rawBody.card4no) mergedData.card4no = String(rawBody.card4no);
                if (rawBody.cardBrand) mergedData.cardBrand = String(rawBody.cardBrand);
                if (rawBody.issuer) mergedData.issuer = String(rawBody.issuer);

                const paymentMethod = await prisma.paymentMethod.create({
                    data: {
                        userId: order.userId,
                        provider: "OEN",
                        token: token,
                        data: (Object.keys(mergedData).length > 0 ? mergedData : Prisma.DbNull) as Prisma.InputJsonValue,
                    },
                });
                paymentMethodId = paymentMethod.id;
                console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Saved token for user ${order.userId} in PaymentMethod`);
            }
        }


        const isPaymentSuccess = status === "SUCCESS" || body.success === true || (token && typeof token === "string");
        const isBindingOrder = order.status === "PENDING" && order.type === "OEN_BINDING";

        if (isPaymentSuccess && isBindingOrder) {
            // Info: (20260302 - Tzuhan) [流程 4-4: 發動正式扣款] 確認綁卡成功且原始訂單為發起綁卡狀態，則進入正式扣款流程
            const orderData = order.data as IOenOrderData;
            console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Processing successful binding for order ${order.id}, credits=${orderData.credits}, amount=${orderData.amount}`,
            );

            if (orderData.credits && orderData.amount && token) {

                console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Charging bound token for order ${order.id}...`,
                );

                // Info: (20260302 - Tzuhan) [流程 4-5: 建立 OEN_PAYMENT 扣款訂單]
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
                        },
                    },
                });
                console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Created OEN_PAYMENT chargeOrder: ${chargeOrder.id}`,
                );

                // Info: (20260302 - Tzuhan) 建立 Transaction 紀錄，與訂單及信用卡綁定
                const paymentTransaction = await prisma.paymentTransaction.create({
                    data: {
                        userId: order.userId,
                        paymentMethodId: paymentMethodId,
                        orderId: chargeOrder.id,
                        provider: "OEN",
                        amount: orderData.amount,
                        status: "PENDING",
                    }
                });
                console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Created payment transaction: ${paymentTransaction.id}`);

                // Info: (20260302 - Tzuhan) [流程 4-6: 更新原始綁卡訂單] 綁卡階段已結束，將其標示為 COMPLETED
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: "COMPLETED" },
                });
                console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Marked binding order ${order.id} as COMPLETED`,
                );

                // Info: (20260302 - Tzuhan) [流程 4-7: 呼叫 OEN API 進行扣款] (與流程 3-6a 相同)，使用剛剛取得的 token 進行請款
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
                    // Info: (20260302 - Tzuhan) [流程 4-8: 扣款成功，鑄造代幣] (同流程 3-7a) 發行點數至用戶錢包
                    console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Charge successful for order ${chargeOrder.id}, proceeding to mint points.`,
                    );

                    // Info: (20260302 - Tzuhan) 將實體交易紀錄標示為成功
                    await prisma.paymentTransaction.update({
                        where: { id: paymentTransaction.id },
                        data: {
                            status: "SUCCESS",
                            rawData: oenData
                        }
                    });

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
                        // Info: (20260302 - Tzuhan) [流程 4-9: 更新扣款訂單完成] 將剛剛建立的 OEN_PAYMENT 更新為 COMPLETED，並儲存 transactionHash
                        const txHash = (mintResult.data as { tx: string })?.tx;
                        await prisma.order.update({
                            where: { id: chargeOrder.id },
                            data: {
                                status: "COMPLETED",
                                transactionHash: txHash,
                                data: {
                                    ...orderData,
                                    callbackBody: body,
                                    chargeResponse: oenData,
                                } as Prisma.InputJsonObject,
                            },
                        });
                        console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Order ${chargeOrder.id} completed, minted ${orderData.credits} credits. txHash: ${txHash}`,
                        );
                    } else {
                        await prisma.order.update({
                            where: { id: chargeOrder.id },
                            data: {
                                status: "MINT_FAILED",
                                data: {
                                    ...orderData,
                                    callbackBody: body,
                                    chargeResponse: oenData,
                                    error: mintResult.message,
                                } as Prisma.InputJsonObject,
                            },
                        });
                        console.error("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Mint failed for order ${chargeOrder.id}: ${mintResult.message}`,
                        );
                    }
                } else {
                    console.error("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] Charge failed for order ${chargeOrder.id}:`,
                        oenData,
                    );

                    // Info: (20260302 - Tzuhan) 將實體交易紀錄標示為失敗
                    await prisma.paymentTransaction.update({
                        where: { id: paymentTransaction.id },
                        data: {
                            status: "FAILED",
                            rawData: oenData,
                            errorMessage: "Charge failed via OEN"
                        }
                    });

                    await prisma.order.update({
                        where: { id: chargeOrder.id },
                        data: {
                            status: "FAILED",
                            data: {
                                ...orderData,
                                callbackBody: body,
                                chargeResponse: oenData,
                                error: "Charge failed via OEN",
                            } as Prisma.InputJsonObject,
                        },
                    });
                }
            } else if (!token) {
                console.log("Deprecate: (20260310 - Tzuhan) ", `[OEN Callback] No token received for order ${order.id}, cannot charge.`,
                );

            }
        }

        return NextResponse.json({ message: "OK" });
    } catch (error) {
        console.error("Deprecate: (20260310 - Tzuhan) ", "[OEN Callback] Error processing webhook:", error);
        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 },
        );
    }
}
