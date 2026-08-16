import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { TeamRole } from "@/constants/team";
import { inviteMemberByEmail } from "@/services/team_invitation.service";

/**
 * Info: (20260815 - Luphia) 以 email 邀請成員（規範 §4 / P4）。
 *
 * 與同層的位址邀請並列而非合併：兩者的輸入、失敗模式與後續動作都不同
 * （這支要寄信、要處理寄不出去的回滾），塞進同一支只會讓兩條路互相干擾。
 *
 * 權限與簽章的要求與位址邀請一致——這個動作會補收席次費用，
 * 而「會扣錢的動作要有當下的簽章」是本站既有的界線。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const { team_id: teamId } = await params;

    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator || (operator.role !== "OWNER" && operator.role !== "ADMIN")) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
    }

    const body = await request.json();
    const { email, role, authentication } = body;

    if (!email || typeof email !== "string") {
      return jsonFail(API_ERRORS.VL_INVALID_EMAIL);
    }
    if (!authentication) {
      return jsonFail(API_ERRORS.VL_MISSING_FIDO2);
    }

    const operatorUser = await webAuthnRepo.findUserById(sessionUser.id);
    if (!operatorUser || !operatorUser.currentChallenge) {
      return jsonFail(API_ERRORS.UN_MISSING_WEBAUTHN_CHALLENGE);
    }

    await webAuthnService.verifySignature(
      sessionUser.address,
      authentication,
      operatorUser.currentChallenge,
    );

    // Info: (20260815 - Luphia) 用過即清，防重放（與位址邀請相同）
    await webAuthnRepo.clearChallenge(sessionUser.id);

    const assignedRole = ["OWNER", "ADMIN", "EDITOR", "VIEWER"].includes(role)
      ? (role as TeamRole)
      : ("VIEWER" as TeamRole);

    const result = await inviteMemberByEmail({
      teamId,
      operatorUserId: sessionUser.id,
      email,
      role: assignedRole,
      nowMs: Date.now(),
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
    console.error("[API] /team/[team_id]/invitations/email POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
