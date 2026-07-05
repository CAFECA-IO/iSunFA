import { getAdminCommissionOrdersPaginated } from "@/services/order.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { MANAGEMENT_TYPE, ManagementType } from "@/constants/status";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const managementType = (searchParams.get("managementType") ||
      MANAGEMENT_TYPE.ALL) as ManagementType;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || MANAGEMENT_TYPE.ALL;
    const executionStatus =
      searchParams.get("executionStatus") || MANAGEMENT_TYPE.ALL;
    const orderStatus = searchParams.get("orderStatus") || MANAGEMENT_TYPE.ALL;
    const sortBy = searchParams.get("sortBy") || "";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    const result = await getAdminCommissionOrdersPaginated({
      managementType,
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
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
