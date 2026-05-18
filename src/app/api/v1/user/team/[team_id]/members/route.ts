import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { TeamRole } from "@/constants/team";

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
    return jsonOk(members);
  } catch (error) {
    console.error("[API] /team/[team_id]/members GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { teamId } = await params;

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

    const newMember = await teamRepo.createTeamMember({
      team: { connect: { id: teamId } },
      user: { connect: { id: targetUser.id } },
      role: assignedRole,
    });

    return jsonOk(newMember);
  } catch (error) {
    console.error("[API] /team/[team_id]/members POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
