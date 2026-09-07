import { getAdminApplicationsPaginated } from "@/services/solution.service";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260706 - Luphia) 管理後台：取得申請紀錄列表
 * GET /api/v1/admin/applications
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), {
      fallback: 1,
    });
    const limit = parsePositiveInt(searchParams.get("limit"), {
      fallback: 15,
      max: 100,
    });
    const search = searchParams.get("search") || "";
    const solutionId = searchParams.get("solutionId") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    const result = await getAdminApplicationsPaginated({
      page,
      limit,
      search,
      solutionId,
      status,
      sortBy,
      sortOrder,
    });

    return jsonOk(result);
  } catch (error) {
    console.error("[Admin Applications API Error]:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
