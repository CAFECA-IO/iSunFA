import { API_ERRORS } from "@/lib/utils/error_dictionary";
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
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const teams = await teamRepo.listMemberTeam(sessionUser.id);
    return jsonOk(teams);
  } catch (error) {
    console.error("[API] /team GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return jsonFail({
        code: "VA000099",
        message: "Team name is required",
        status: ApiCode.VALIDATION_ERROR,
      });
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
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
