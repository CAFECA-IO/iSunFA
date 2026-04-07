import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const teams = await teamRepo.listMemberTeam(sessionUser.id);
    return jsonOk(teams);
  } catch (error) {
    console.error("[API] /team GET error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Team name is required");
    }

    const team = await teamRepo.createTeam({ name: body.name.trim() });
    await teamRepo.createTeamMember({
      team: { connect: { id: team.id } },
      user: { connect: { id: sessionUser.id } },
      role: "OWNER",
    });

    return jsonOk(team);
  } catch (error) {
    console.error("[API] /team POST error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
