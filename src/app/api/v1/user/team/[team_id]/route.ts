import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { isTeamManagerRole } from "@/constants/team";

// Info: (20260325 - Tzuhan) Rename a team
export async function PATCH(
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
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return jsonFail(API_ERRORS.VA_INVALID_TEAM_NAME);
    }

    const member = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!isTeamManagerRole(member?.role)) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
    }

    const updatedTeam = await teamRepo.updateTeam(teamId, { name });
    return jsonOk(updatedTeam);
  } catch (error) {
    console.error("[API] /team/[team_id] PATCH error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
