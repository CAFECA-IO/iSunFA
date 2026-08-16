import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { TEAM_INVITATION_STATUS } from "@/constants/status";

/**
 * Info: (20260815 - Luphia) 撤回尚未接受的邀請（產品拍板 20260815）。
 *
 * 席次的佔用者是「成員 + 尚未失效的 PENDING 邀請」，因此打錯一個字寄出的邀請
 * 會佔住一個**已經付過錢**的席次直到七天後逾期。沒有這支端點，管理員唯一的選擇
 * 是等，或再付一次錢——而那一席明明已經是他們的了。
 *
 * 撤回**不退費**（`subscription.seats` 不減），但空出來的位置可以立刻用於邀請別人。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string; invite_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId, invite_id: inviteId } = await params;

    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator || (operator.role !== "OWNER" && operator.role !== "ADMIN")) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
    }

    const invitation = await teamRepo.getInvitationByIdWithDetails(inviteId);
    /**
     * Info: (20260815 - Luphia) 邀請必須屬於路徑上的團隊。
     * 少了這一行，任何團隊的管理員都能刪掉別的團隊的邀請——
     * 權限檢查通過的是「他對 teamId 的權限」，而不是「他對這筆邀請的權限」。
     */
    if (!invitation || invitation.teamId !== teamId) {
      return jsonFail(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
    }
    if (invitation.status !== TEAM_INVITATION_STATUS.PENDING) {
      return jsonFail(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
    }

    await teamRepo.deleteInvitation(inviteId);

    /**
     * Info: (20260815 - Luphia) 回報「席次已釋出、費用不退」，前端才說得出這件事。
     * 管理員最想知道的是「那筆錢有沒有白花」，而答案是沒有——位置還在。
     */
    return jsonOk({ id: inviteId, seatReleased: true, refunded: false });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error(
      "[API] /team/[team_id]/invitations/[invite_id] DELETE error:",
      error,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
