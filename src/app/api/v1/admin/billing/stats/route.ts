import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Role } from "@/constants/role";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { adminBillingService } from "@/services/admin.billing.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const tab =
      (searchParams.get("tab") as "orders" | "points" | "credit_cards") ||
      "orders";
    const page = parsePositiveInt(searchParams.get("page"), {
      fallback: 1,
    });
    const limit = parsePositiveInt(searchParams.get("limit"), {
      fallback: 20,
      max: 100,
    });

    const stats = await adminBillingService.getGlobalBillingStats(
      startDate,
      endDate,
      tab,
      page,
      limit,
    );

    return jsonOk(stats);
  } catch (error) {
    console.error("[API] /admin/billing/stats GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
