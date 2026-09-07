import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { listUserDocuments } from "@/services/user_document.service";

/**
 * Info: (20260817 - Luphia) 「文件與記憶」頁的文件清單。
 *
 * 一律以 `sessionUser` 為對象，不接受任何指定他人的參數——
 * 這支要回答的是「**我**在這個系統上放了什麼」，而不是查詢介面。
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { searchParams } = new URL(request.url);
    // Info: (20260817 - Luphia) 共用解析：`?limit=abc` 不該讓端點噴 500（第二輪 C-8）
    const limit = parsePositiveInt(searchParams.get("limit"), {
      fallback: 50,
      max: 200,
    });

    const documents = await listUserDocuments({
      userId: sessionUser.id,
      // Info: (20260817 - Luphia) 碳盤查草稿以公鑰定址，不是 FK
      address: sessionUser.address,
      limit,
    });
    return jsonOk({ documents });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /user/documents GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
