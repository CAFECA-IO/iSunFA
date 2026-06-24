import { NextResponse } from "next/server";
import { getAdminCommissionOrdersPaginated } from "@/services/order.service";
import { jsonOk } from "@/lib/utils/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "ALL";
    const executionStatus = searchParams.get("executionStatus") || "ALL";
    const orderStatus = searchParams.get("orderStatus") || "ALL";
    const sortBy = searchParams.get("sortBy") || "";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    const result = await getAdminCommissionOrdersPaginated({
      page,
      limit,
      search,
      type,
      orderStatus,
      executionStatus,
      sortBy,
      sortOrder,
    });

    return jsonOk(result);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
