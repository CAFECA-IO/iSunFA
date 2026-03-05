import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IOenOrderData } from "@/interfaces/payment";
import { Prisma } from "@/generated/client";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";

const OEN_ACCESS_TOKEN = process.env.OEN_ACCESS_TOKEN;

// Info: (20260305 - Tzuhan) Get all payment methods for the user
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        const user = await getIdentityFromDeWT(authHeader);

        if (!user) {
            return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or missing device token');
        }

        const paymentMethods = await prisma.paymentMethod.findMany({
            where: { userId: user.id, provider: 'OEN' },
            select: {
                id: true,
                provider: true,
                data: true,
                isDefault: true,
                createdAt: true,
            }
        });

        return jsonOk({
            paymentMethods: paymentMethods.map(pm => ({
                ...pm,
                createdAt: pm.createdAt.toISOString()
            })),
        });
    } catch (error) {
        console.error('[API] /user/payment_method GET error:', error);
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
    }
}

// Info: (20260305 - Tzuhan) Bind a new credit card via OEN
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");
        const user = await getIdentityFromDeWT(authHeader);

        if (!user) {
            return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
        }

        const order = await prisma.order.create({
            data: {
                userId: user.id,
                type: "OEN_BINDING",
                amount: 0,
                challenge: "N/A",
                data: {
                    credits: 0,
                    amount: 0,
                },
            },
        });

        const originBase = request.nextUrl.origin;
        const webhookBase = process.env.NEXT_PUBLIC_APP_URL || originBase;

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
                    // Info: (20260305 - Tzuhan) 綁定成功後，OEN 將用戶導回前台
                    successUrl: `${webhookBase}/pricing?tab=credits&binding_success=true&order_id=${order.id}`,
                    failureUrl: `${webhookBase}/pricing?tab=credits&binding_failure=true&order_id=${order.id}`,
                    customId: order.id,
                    callbackUrl: `${webhookBase}/api/payment/callback/oen`,
                }),
            },
        );

        const oenData = await oenRes.json();

        if (oenData.code === "S0000" && oenData.data?.id) {
            const paymentId = oenData.data.id;

            await prisma.order.update({
                where: { id: order.id },
                data: { data: { ...(order.data as IOenOrderData), paymentId: paymentId } as Prisma.InputJsonObject },
            });

            return jsonOk({
                requireBinding: true,
                paymentId: paymentId,
                redirectUrl: `https://mermer.testing.oen.tw/checkout/subscription/create/${paymentId}`,
            });
        } else {
            return jsonFail(
                ApiCode.INTERNAL_SERVER_ERROR,
                "Failed to get OEN checkout token",
                oenData,
            );
        }
    } catch {
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
    }
}
