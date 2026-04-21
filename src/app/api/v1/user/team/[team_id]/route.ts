import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";

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
      return jsonFail({ code: "VA000099", message: "Invalid team name", status: ApiCode.VALIDATION_ERROR });
    }

    const member = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return jsonFail({ code: "FO000099", message: "Permission denied. Only OWN...", status: ApiCode.FORBIDDEN },  );
    }

    const updatedTeam = await teamRepo.updateTeam(teamId, { name });
    return jsonOk(updatedTeam);
  } catch (error) {
    console.error("[API] /team/[team_id] PATCH error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
