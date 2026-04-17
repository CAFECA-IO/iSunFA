import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/generated/enums";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { adminBillingService } from "@/services/admin.billing.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(request.headers.get("Authorization"));
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Admin access required");
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const tab = (searchParams.get("tab") as "orders" | "points" | "credit_cards") || "orders";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const stats = await adminBillingService.getGlobalBillingStats(
      startDate,
      endDate,
      tab,
      page,
      limit
    );

    return jsonOk(stats);
  } catch (error) {
    console.error("[API] /admin/billing/stats GET error:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch global billing stats",
    );
  }
}
