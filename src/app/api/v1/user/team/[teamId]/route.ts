import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";

// Info: (20260325 - Tzuhan) Rename a team
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { teamId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid team name");
    }

    const member = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return jsonFail(ApiCode.FORBIDDEN, "Permission denied. Only OWNER or ADMIN can edit the team name.");
    }

    const updatedTeam = await teamRepo.updateTeam(teamId, { name });
    return jsonOk(updatedTeam);
  } catch (error) {
    console.error("[API] /team/[teamId] PATCH error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
