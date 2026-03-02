import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Info: (20260302 - Tzuhan) [流程 4-1: 獲取身分驗證資訊] 從 Header 中取得 DeWT Token 並解析出使用者資訊
        const authHeader = request.headers.get("Authorization");
        const user = await getIdentityFromDeWT(authHeader);

        if (!user) {
            return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
        }

        const orderId = params.id;

        if (!orderId) {
            return jsonFail(ApiCode.VALIDATION_ERROR, "Order ID is required");
        }

        // Info: (20260302 - Tzuhan) [流程 4-2: 查詢訂單資料] 從資料庫撈取特定訂單並檢查是否屬於該使用者
        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
                userId: user.id, // Ensure the user can only fetch their own order
            },
            select: {
                id: true,
                status: true,
                transactionHash: true,
                data: true
            }
        });

        if (!order) {
            return jsonFail(ApiCode.NOT_FOUND, "Order not found");
        }

        // Info: (20260302 - Tzuhan) [流程 4-3: 判斷失敗狀態並附帶錯誤] 如果狀態是失敗，嘗試從其 data 欄位把詳細的 Error 摘要帶回前端
        let errorMessage = null;
        if (order.status === "FAILED" || order.status === "MINT_FAILED") {
            errorMessage = (order.data as { error?: string })?.error || "Payment processing failed";
        }

        // Info: (20260302 - Tzuhan) [流程 4-4: 回傳訂單狀態] 讓前端決定是否繼續輪詢或是轉換 UI 頁面 (前往成功或失敗)
        return jsonOk({
            id: order.id,
            status: order.status,
            transactionHash: order.transactionHash,
            errorMessage
        });
    } catch (error) {
        console.error("[API] GET /user/order/[id] error:", error);
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Failed to fetch order details");
    }
}
