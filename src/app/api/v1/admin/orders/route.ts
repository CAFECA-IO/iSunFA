import { NextResponse } from "next/server";
import { orderRepo } from "@/repositories/order.repo";
import { orderIssueService } from "@/services/order.issue.service";
import { jsonOk } from "@/lib/utils/response";



export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const skip = (page - 1) * limit;

    const [totalElements, orders] = await Promise.all([
      orderRepo.countCommissionOrders(),
      orderRepo.getAllCommissionOrdersPaginated(skip, limit),
    ]);

    const mappedOrders = await orderIssueService.getExecutionStatusesForOrders(orders);

    return jsonOk({
      data: mappedOrders,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
