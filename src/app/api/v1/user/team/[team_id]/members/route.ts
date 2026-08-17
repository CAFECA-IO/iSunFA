import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { chargeSeatAddition } from "@/services/team_seat.service";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { TeamRole, isTeamManagerRole } from "@/constants/team";
import { attachEmailMismatch } from "@/lib/team/member_visibility";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { team_id: teamId } = await params;

    // Info: (20260325 - Tzuhan) Verify user is in this team
    const member = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!member) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_YOU_ARE);
    }

    const members = await teamRepo.listTeamMember(teamId);

    /**
     * Info: (20260818 - Luphia) 標出「以信箱不符的邀請加入」的成員（第三輪 C-2）。
     *
     * 接受邀請不綁身分是刻意的（`User` 沒有 email 欄位，模型是 bearer token），
     * 所以這個訊號更需要被看見：轉寄出去的連結被外人用掉時，DB 會記下
     * `MISMATCHED`，而在此之前沒有任何地方讀它。
     *
     * **只給管理職**：這是關於「某位成員怎麼進來的」的資訊，
     * 一般成員沒有對應的問題，也沒有處置的權限。
     */
    const mismatched = isTeamManagerRole(member.role)
      ? await teamRepo.listMismatchedAcceptorIds(teamId)
      : [];
    return jsonOk(attachEmailMismatch(members, member.role, mismatched));
  } catch (error) {
    console.error("[API] /team/[team_id]/members GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260813 - Luphia) 路由參數為 team_id；取錯名字會讓 teamId 成為 undefined，
    // Info: (20260813 - Luphia) 使權限檢查退化成「屬於任一團隊即通過」，且建立成員時必然拋錯
    const { team_id: teamId } = await params;

    // Info: (20260325 - Tzuhan) Check permission (OWNER or ADMIN)
    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator || (operator.role !== "OWNER" && operator.role !== "ADMIN")) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
    }

    const body = await request.json();
    const { address, role, authentication } = body;

    if (!address || typeof address !== "string") {
      return jsonFail(API_ERRORS.VL_INVALID_ADDRESS);
    }

    if (!authentication) {
      return jsonFail(API_ERRORS.VL_MISSING_FIDO2);
    }

    // Info: (20260325 - Tzuhan) Fetch operator's current challenge
    const operatorUser = await webAuthnRepo.findUserById(sessionUser.id);
    if (!operatorUser || !operatorUser.currentChallenge) {
      return jsonFail(API_ERRORS.UN_MISSING_WEBAUTHN_CHALLENGE);
    }

    // Info: (20260325 - Tzuhan) Verify FIDO2 signature
    await webAuthnService.verifySignature(
      sessionUser.address,
      authentication,
      operatorUser.currentChallenge,
    );

    // Info: (20260325 - Tzuhan) Clear challenge to prevent replay
    await webAuthnRepo.clearChallenge(sessionUser.id);

    const assignedRole: TeamRole =
      role === "ADMIN" || role === "EDITOR" || role === "VIEWER"
        ? role
        : TeamRole.VIEWER;

    // Info: (20260325 - Tzuhan) Find the target user by address
    const targetUser = await webAuthnRepo.findUserByAddress(address);
    if (!targetUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260325 - Tzuhan) Check if user is already a member
    const existingMember = await teamRepo.getTeamMember(targetUser.id, teamId);
    if (existingMember) {
      return jsonFail(API_ERRORS.VA_USER_IS_ALREADY_A_MEMBER_OF);
    }

    /**
     * Info: (20260814 - Luphia) 直接加人也要補收席次費用（規範 §4）：
     * 這條路徑繞過邀請，若不收費就會成為「免費加席」的後門。
     */
    const seatCharge = await chargeSeatAddition({
      teamId,
      seats: 1,
      nowMs: Date.now(),
      // Info: (20260814 - Luphia) 記下發起者與冪等鍵，與邀請路徑同一套護欄（第二輪 B-2 / B-3）
      operatorUserId: sessionUser.id,
      idempotencyKey: `add-member:${teamId}:${targetUser.id}`,
    });

    const newMember = await teamRepo.createTeamMember({
      team: { connect: { id: teamId } },
      user: { connect: { id: targetUser.id } },
      role: assignedRole,
    });

    return jsonOk({ ...newMember, seatCharge });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /team/[team_id]/members POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
