import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { pointService } from "@/services/point.service";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const history = await pointService.getPointHistory(user);

    return jsonOk({ pointHistory: history });
  } catch (error) {
    console.error("[API] /user/point_history GET error:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_FETCH_POINT_HISTORY);
  }
}
