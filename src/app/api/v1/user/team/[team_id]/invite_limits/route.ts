import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { isTeamManagerRole } from "@/constants/team";
import { teamRepo } from "@/repositories/team.repo";
import { getInviteLimits } from "@/services/team_invitation.service";

/**
 * Info: (20260819 - Luphia) GET /api/v1/user/team/[team_id]/invite_limits
 *
 * 邀請量的現況：冷卻剩餘秒數、同時未接受數、今日寄送數，以及各自的上限。
 * 對話框開啟時讀一次，讓「還要等 43 秒」在**按下去之前**就看得到——
 * 只在按下去之後才說「請稍後再試」，使用者只能一直按，而每一次按都是一次請求。
 *
 * 完全唯讀。權限與邀請端點同一道（管理職）：這是團隊的營運狀態，
 * 而且試算與真的送出看到的規則要一致。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;
    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!isTeamManagerRole(operator?.role)) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
    }

    return jsonOk(await getInviteLimits(teamId, Date.now()));
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(API_ERRORS.TW_OPERATION_FAILED);
  }
}
