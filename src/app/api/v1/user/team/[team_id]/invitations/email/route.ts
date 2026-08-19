import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { canGrantRole, TeamRole } from "@/constants/team";
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
    const { email, role, authentication, expectedAmount } = body;

    if (!email || typeof email !== "string") {
      return jsonFail(API_ERRORS.VL_INVALID_EMAIL);
    }
    if (!authentication) {
      return jsonFail(API_ERRORS.VL_MISSING_FIDO2);
    }

    /**
     * Info: (20260819 - Luphia) `expectedAmount` 必填（review #6682）。
     *
     * 「試算失敗就不能送出」先前只活在前端送出按鈕的 disabled 陣列裡，服務端對
     * 「有沒有先試算過」毫無要求——刪掉前端那一行，行為就精準退回這個 PR 要修的
     * 事：試算掛掉照樣刷卡、事前事後都沒有金額。這裡把要求移到服務端。
     *
     * 值為 0 也是有效的（「不會收費」也是一種顯示過的答案，而它變成收費正是
     * 最糟的那種分岔），因此判斷的是型別與非負，不是真值。
     */
    if (
      typeof expectedAmount !== "number" ||
      !Number.isInteger(expectedAmount) ||
      expectedAmount < 0
    ) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
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

    /**
     * Info: (20260818 - Luphia) 只有 OWNER 能授予 OWNER（第三輪 B-3）。
     *
     * 上面的權限閘是 OWNER || ADMIN，對「授予什麼角色」原本毫無檢查——
     * ADMIN 送 `role: "OWNER"` 邀請自己的第二個帳號，接受後團隊就多一位 OWNER。
     * 變更**既有**成員角色的端點早就有這道檢查，邀請這條路漏了。
     */
    if (!canGrantRole(operator.role, assignedRole)) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
    }

    const result = await inviteMemberByEmail({
      teamId,
      // Info: (20260819 - Luphia) 畫面上顯示過的金額，扣款前比對（review #6682 高）
      expectedAmount,
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
