import { getBlockchainDashboardData } from "@/services/admin.blockchain.service";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonFail(ApiCode.UNAUTHORIZED, "Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const result = await getBlockchainDashboardData(token);
    
    if (!result.success) {
      return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, result.error || "Dashboard error");
    }

    return jsonOk(result.data);
  } catch (error) {
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, (error as Error).message);
  }
}
