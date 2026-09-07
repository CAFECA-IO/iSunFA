import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { deleteFaithMemoryItem } from "@/services/faith_memory.service";

/**
 * Info: (20260817 - Luphia) 刪除單一則費思記憶（「文件與記憶」頁）。
 *
 * 整包刪除（同層 DELETE）是條款承諾的「被遺忘權」；這支是它的實用版本——
 * 費思記錯一件事時，使用者要的是拿掉那一條，而不是把累積的偏好全部丟掉。
 *
 * 授權與同層一致：必須是該團隊成員，且對象一律是自己。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string; item_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId, item_id: itemId } = await params;

    const member = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!member) return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);

    /**
     * Info: (20260817 - Luphia) 找不到也回成功：重複點刪除是常見操作，
     * 而「這個 id 存不存在」不該變成一個可以探測的問題。
     */
    const deleted = await deleteFaithMemoryItem({
      userId: sessionUser.id,
      teamId,
      itemId,
    });
    return jsonOk({ deleted });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] faith_memory/[item_id] DELETE error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
