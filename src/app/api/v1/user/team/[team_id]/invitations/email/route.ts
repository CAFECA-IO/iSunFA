import { NextRequest } from "next/server";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail, jsonFailWithPayload } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { teamRepo } from "@/repositories/team.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { canGrantRole, isTeamManagerRole, TeamRole } from "@/constants/team";
import {
  InviteCooldownError,
  inviteMemberByEmail,
} from "@/services/team_invitation.service";

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

    /**
     * Info: (20260819 - Luphia) 寄送端的限流（產品決定 20260819）。
     *
     * 免費版人數上限移除之後，寄信量沒有任何界線。這一層依**操作者**擋單人狂點
     * （10/分、100/日）；整團的總量另有兩道團隊層上限
     * （`assertInviteVolumeWithinLimits`）——多位管理員各自在限流額度內，
     * 仍然能疊出大量寄信，所以兩層都要。
     *
     * 維度用 `sessionUser.address` 而不是 IP：同一間辦公室的兩位管理員不該互相
     * 排擠，而同一個人換 IP 也不該重新計數。
     */
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.TEAM_INVITE_SEND,
    );
    if (limited) return limited;

    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!isTeamManagerRole(operator?.role)) {
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

    /**
     * Info: (20260819 - Luphia) 可授予的角色以列舉為準（團隊 ADMIN 已取消）。
     * 先前是手寫字串陣列，於是移除角色時這裡會被漏掉——列舉改了、這裡沒改，
     * 邀請仍然收得下一個已經不存在的角色。
     */
    /**
     * Info: (20260819 - Luphia) 不認識的角色一律**拒絕**，不要靜默降為 VIEWER
     * （review #6685 中-3）。
     *
     * 這條路徑會扣款。舊行為是「不認識就當 VIEWER」，於是：部署後 OWNER 的瀏覽器
     * 還跑著快取的舊 JS（邀請對話框仍列出 ADMIN 選項），或某個 integration 仍送
     * `role: "ADMIN"` → 流程走完 → **先扣一席的錢** → 建一封 VIEWER 邀請 → 回 200。
     * 團隊付了錢、拿到一個角色不對的成員，畫面沒有任何錯誤。
     *
     * 同一組功能的 `members/[member_id]` 對同樣的輸入是拒絕的——兩條路對同一個
     * 非法輸入給出兩種結果，本身就是缺陷。會扣款的路徑，fail-closed 的方向是拒絕。
     */
    if (!(Object.values(TeamRole) as string[]).includes(role)) {
      return jsonFail(API_ERRORS.AUTH_INVALID_ROLE);
    }
    const assignedRole = role as TeamRole;

    /**
     * Info: (20260818 - Luphia) 只有 OWNER 能授予 OWNER（第三輪 B-3）。
     *
     * 上面的權限閘原本是 OWNER || ADMIN，對「授予什麼角色」毫無檢查——
     * ADMIN 送 `role: "OWNER"` 邀請自己的第二個帳號，接受後團隊就多一位 OWNER。
     *
     * Info: (20260819 - Luphia) 團隊 ADMIN 已取消，這條路徑只剩 OWNER 走得到，
     * 因此這道檢查現在恆為真。**保留**它：權限閘與「能授予什麼」是兩件事，
     * 哪天管理職的集合又變大，少了這道就會再開一次同樣的洞。
     */
    if (!canGrantRole(operator?.role, assignedRole)) {
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
    /**
     * Info: (20260819 - Luphia) 冷卻的剩餘秒數要帶到前端（產品決定 20260819）。
     *
     * 走 `jsonFailWithPayload`（與 402 額度用罄同一個作法）——用一般的 jsonFail
     * 那個數字就掉了，而前端只剩「請稍後再試」可以顯示，使用者只能一直按。
     */
    if (error instanceof InviteCooldownError) {
      return jsonFailWithPayload(API_ERRORS.TW_INVITE_COOLDOWN, error.data);
    }
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
