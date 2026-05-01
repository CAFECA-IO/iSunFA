import { getBlockchainDashboardData } from "@/services/admin.blockchain.service";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonFail(API_ERRORS.AUTH_MISSING_HEADER);

    const token = authHeader.replace("Bearer ", "");
    const result = await getBlockchainDashboardData(token);

    if (!result.success) {
      return jsonFail({
        code: "IS000099",
        message: String(result.error || "Dashboard error").slice(0, 30),
        status: ApiCode.INTERNAL_SERVER_ERROR,
      });
    }

    return jsonOk(result.data);
  } catch (error) {
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
