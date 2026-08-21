import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { listNotifications } from "@/services/notification.service";

/**
 * Info: (20260821 - Luphia) 小鈴鐺展開的清單（ADR 021 補充）。
 * 純端口：驗身分 → service → 回傳。待辦與完成的分節在 service。
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const list = await listNotifications({
      userId: user.id,
      address: user.address,
      nowMs: Date.now(),
    });
    return jsonOk(list);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
