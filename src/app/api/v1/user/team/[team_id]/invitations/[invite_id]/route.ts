import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { revokeInvitation } from "@/services/team_invitation.service";

/**
 * Info: (20260815 - Luphia) 撤回尚未接受的邀請（產品拍板 20260815）。
 *
 * 席次的佔用者是「成員 + 尚未失效的 PENDING 邀請」，因此打錯一個字寄出的邀請
 * 會佔住一個**已經付過錢**的席次直到七天後逾期。沒有這支端點，管理員唯一的選擇
 * 是等，或再付一次錢——而那一席明明已經是他們的了。
 *
 * 權限與狀態的判定在 service（CLAUDE.md §1），此處為純端口。
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

    const result = await revokeInvitation({
      teamId,
      inviteId,
      operatorUserId: sessionUser.id,
    });
    return jsonOk(result);
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
