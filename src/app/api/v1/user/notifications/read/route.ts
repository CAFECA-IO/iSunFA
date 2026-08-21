import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { markNotificationsRead } from "@/services/notification.service";

/**
 * Info: (20260821 - Luphia) 打開鈴鐺＝看過了：事件型全部標已讀。
 * 沒有 body（一律全讀）——逐 id 已讀會讓截斷在清單之外的通知永遠未讀，
 * 而「部分已讀」對這個鈴鐺沒有對應的使用情境。
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);
    if (!user) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const count = await markNotificationsRead({
      userId: user.id,
      nowMs: Date.now(),
    });
    return jsonOk({ read: count });
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
