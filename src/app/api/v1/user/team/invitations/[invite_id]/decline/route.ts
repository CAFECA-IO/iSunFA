import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { TEAM_INVITATION_STATUS } from "@/constants/status";

/**
 * Info: (20260816 - Luphia) 拒絕以錢包位址寄出的邀請（條款 §3.6）。
 *
 * 位址邀請的受邀者一定已經有帳號（位址就是他的帳號），所以這一支要登入，
 * 並且只有**受邀者本人**能拒絕——與同層 accept 的檢查一致。
 *
 * 但**不要求 FIDO2 簽章**，accept 要。兩者不對稱是刻意的：接受會讓你成為一個
 * 握有他人帳務資料的團隊成員，拒絕則什麼都不會發生，只是把一個位置還回去。
 * 為一個零後果的動作要求簽章，換來的是沒有人會按它，而那一席繼續佔著。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invite_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { invite_id: inviteId } = await params;

    const invitation = await teamRepo.getInvitationByIdWithDetails(inviteId);
    if (!invitation || invitation.status !== TEAM_INVITATION_STATUS.PENDING) {
      return jsonFail(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
    }

    if (invitation.inviteeAddress !== sessionUser.address) {
      return jsonFail(API_ERRORS.FO_YOU_ARE_NOT_THE_INTENDED_RE);
    }

    /**
     * Info: (20260816 - Luphia) `false` = 這封邀請在上面那次讀取之後已經不是 PENDING。
     * 當成查無此邀請，不要回一個「已拒絕」的假象。
     */
    const declined = await teamRepo.declineInvitation(inviteId);
    if (!declined) return jsonFail(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);

    return jsonOk({ id: inviteId, teamId: invitation.teamId });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /team/invitations/[invite_id]/decline error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
