import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

import { IOenCallbackPayload, IOenCallbackData, IOenOrderData } from "@/interfaces/payment";

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



        if (token && typeof token === "string") {
            const existingMethod = await prisma.paymentMethod.findFirst({
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

                await prisma.paymentMethod.create({
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
        const isBindingOrder = order.status === "PENDING" && order.type === "OEN_BINDING";

        if (isPaymentSuccess && isBindingOrder) {
            await prisma.order.update({
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
