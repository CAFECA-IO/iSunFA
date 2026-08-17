import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { deleteFaithMemoryByRequest } from "@/services/faith_memory.service";

/**
 * Info: (20260817 - Luphia) 刪除自己的費思記憶（條款 §3.7、隱私政策 §6「被遺忘權」）。
 *
 * **只能刪自己的**：路徑上有 teamId，但操作對象一律是 `sessionUser.id`，
 * 不接受任何指定他人的參數。管理者的團隊權限不延伸到成員的對話偏好
 * （規範 §6.1）——OWNER 付錢買的是席次，不是讀寫成員記憶的權力。
 *
 * 立即硬刪，不等 90 天；查無資料回成功（「沒有東西可刪」不是錯誤，
 * 而回 404 會讓「我有沒有記憶」變成一個可以探測的問題）。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;

    // Info: (20260817 - Luphia) 必須是該團隊成員，否則等於可對任意 teamId 探測
    const member = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!member) return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);

    const deleted = await deleteFaithMemoryByRequest(sessionUser.id, teamId);
    return jsonOk({ deleted });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /team/[team_id]/faith_memory DELETE error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
