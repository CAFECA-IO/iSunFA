import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Missing orderId");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return jsonFail(ApiCode.NOT_FOUND, "Order not found");
    }

    if (order.userId !== user.id) {
      return jsonFail(ApiCode.FORBIDDEN, "Order does not belong to user");
    }

    return jsonOk({
      status: order.status,
      transactionHash: order.transactionHash,
    });
  } catch (error) {
    console.error("[API] /payment/oen/status error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
