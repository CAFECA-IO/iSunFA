import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IOenOrderData } from "@/interfaces/payment";
import { Prisma } from "@/generated/client";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { prisma } from "@/lib/prisma";
import { webAuthnService } from "@/services/webauthn.service";
import { ORDER_STATUS, PAYMENT_TRANSACTION_STATUS } from "@/constants/status";

const OEN_ACCESS_TOKEN = process.env.OEN_ACCESS_TOKEN;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ payment_method_id: string }> }
) {
    try {
        const authHeader = request.headers.get("Authorization");
        const user = await getIdentityFromDeWT(authHeader);

        if (!user) {
            return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
        }

        const paymentMethodId = (await params).payment_method_id;
        if (!paymentMethodId) {
            return jsonFail(ApiCode.VALIDATION_ERROR, "paymentMethodId is required");
        }

        // Info: (20260305 - Tzuhan) Expect authentication (FIDO payload) from client
        const { authentication, orderId } = await request.json();

        if (!orderId || !authentication) {
            return jsonFail(ApiCode.VALIDATION_ERROR, "Missing orderId or FIDO authentication payload");
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

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order || order.userId !== user.id || order.status !== ORDER_STATUS.PENDING) {
            return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid or expired order");
        }

        const orderData = order.data as IOenOrderData;
        const { amount, credits } = orderData;

        // Info: (20260305 - Tzuhan) 驗證 FIDO2 簽名
        try {
            await webAuthnService.verifySignature(user.address, authentication, order.challenge);
        } catch (error) {
            console.error("FIDO Verification failed during checkout:", error);
            return jsonFail(ApiCode.UNAUTHORIZED, "FIDO2 Signature verification failed");
        }

        // Info: (20260305 - Tzuhan) Create an initial transaction record, marking it PENDING
        const paymentTransaction = await prisma.paymentTransaction.create({
            data: {
                userId: user.id,
                paymentMethodId: oenPaymentMethod.id,
                orderId: order.id,
                provider: "OEN",
                amount: amount,
                status: PAYMENT_TRANSACTION_STATUS.PENDING,
            }
        });

        // Info: (20260305 - Tzuhan) 準備打給應援科技的扣款請求
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

        // Info: (20260306 - Tzuhan) ======= 扣款失敗 =======
        if (oenData.code !== "S0000" && !oenRes.ok) {
            await prisma.$transaction([
                prisma.paymentTransaction.update({
                    where: { id: paymentTransaction.id },
                    data: { status: PAYMENT_TRANSACTION_STATUS.FAILED, rawData: oenData, errorMessage: "Payment failed via OEN" }
                }),
                prisma.order.update({
                    where: { id: order.id },
                    data: {
                        // Info: (20260305 - Tzuhan) 情境 A: 扣款失敗
                        status: ORDER_STATUS.PAYMENT_FAILED,
                        data: {
                            ...(order.data as IOenOrderData),
                            checkoutResponse: oenData,
                            fidoAuthentication: authentication // Save FIDO payload for potential manual retry later by admin
                        } as Prisma.InputJsonObject,
                    },
                })
            ]);
            return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Payment failed via OEN", oenData);
        }

        // Info: (20260306 - Tzuhan) ======= 扣款成功，開始鑄造代幣 =======
        let dbReceiptId: string;
        await prisma.$transaction(async (tx) => {
            const dbReceipt = await tx.receipt.create({
                data: {
                    orderId: order.id,
                    amount: amount,
                    data: {
                        ...(oenData as Record<string, unknown>),
                        receiptDetails: {
                            amount: order.amount,
                            credits,
                            transactionTime: new Date().toISOString(),
                            buyerId: user.id,
                            buyerName: dbUser?.name || "Unknown",
                            itemDescription: `iSunFA Credits - ${credits}`,
                            gatewayTxId: oenData?.data?.id || oenData?.id || "",
                        }
                    } as Prisma.InputJsonObject
                }
            });
            dbReceiptId = dbReceipt.id;

            await tx.paymentTransaction.update({
                where: { id: paymentTransaction.id },
                data: { status: PAYMENT_TRANSACTION_STATUS.SUCCESS, rawData: oenData }
            });

            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: ORDER_STATUS.PAID,
                    data: {
                        ...(order.data as IOenOrderData),
                        checkoutResponse: oenData,
                        receiptId: dbReceiptId,
                        fidoAuthentication: authentication
                    } as Prisma.InputJsonObject,
                },
            });
        });

        // Info: (20260306 - Tzuhan) 呼叫鑄造代幣合約
        const memo = JSON.stringify({ provider: "OEN", orderId: order.id, amount, credits, paymentMethodId });
        const mintResult = await mintToAddress(CONTRACT_ADDRESSES.NTD_TOKEN, user.address, credits, memo);

        // Info: (20260306 - Tzuhan) ======= 鑄造代幣失敗 =======
        if (!mintResult.success) {
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    // Info: (20260305 - Tzuhan) 情境 B: 發放失敗 (扣款成功)
                    status: ORDER_STATUS.MINT_FAILED,
                    data: {
                        ...(order.data as object),
                        error: mintResult.message,
                        fidoAuthentication: authentication
                    },
                },
            });
            return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Payment succeeded but minting failed: " + mintResult.message);
        }

        // Info: (20260306 - Tzuhan) ======= 全部成功 =======
        const txHash = (mintResult.data as { tx: string })?.tx;

        await prisma.order.update({
            where: { id: order.id },
            data: {
                status: ORDER_STATUS.COMPLETED,
                transactionHash: txHash,
            },
        });

        return jsonOk({
            requireBinding: false,
            success: true,
            txHash: txHash,
        });

    } catch (error) {
        console.error("Internal Server Error in Checkout:", error);
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
    }
}
