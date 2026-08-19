import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { declineInvitationByMember } from "@/services/team_invitation.service";

/**
 * Info: (20260816 - Luphia) 拒絕以錢包位址寄出的邀請（條款 §3.6）。
 *
 * 位址邀請的受邀者一定已經有帳號（位址就是他的帳號），所以這一支要登入，
 * 並且只有**受邀者本人**能拒絕——與同層 accept 的檢查一致。
 *
 * 但**不要求 FIDO2 簽章**，accept 要。兩者不對稱是刻意的：接受會讓你成為一個
 * 握有他人帳務資料的團隊成員，拒絕則什麼都不會發生，只是把一個位置還回去。
 * 為一個零後果的動作要求簽章，換來的是沒有人會按它，而那一席繼續佔著。
 *
 * 身分與狀態的判定在 service（CLAUDE.md §1），此處為純端口。
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

    const result = await declineInvitationByMember({
      inviteId,
      userId: sessionUser.id,
      address: sessionUser.address,
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
    console.error("[API] /team/invitations/[invite_id]/decline error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
