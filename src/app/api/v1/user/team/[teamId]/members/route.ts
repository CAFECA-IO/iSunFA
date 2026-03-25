import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const teamId = params.teamId;

    // Info: (20260325 - Tzuhan) Verify user is in this team
    const member = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!member) {
      return jsonFail(ApiCode.FORBIDDEN, "Permission denied. You are not a member of this team.");
    }

    const members = await teamRepo.listTeamMember(teamId);
    return jsonOk(members);
  } catch (error) {
    console.error("[API] /team/[teamId]/members GET error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const teamId = params.teamId;

    // Info: (20260325 - Tzuhan) Check permission (OWNER or ADMIN)
    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator || (operator.role !== "OWNER" && operator.role !== "ADMIN")) {
      return jsonFail(ApiCode.FORBIDDEN, "Permission denied. Only OWNER or ADMIN can invite members.");
    }

    const body = await request.json();
    const { address, role } = body;

    if (!address || typeof address !== "string") {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid address");
    }

    const assignedRole = role === "ADMIN" || role === "MEMBER" ? role : "MEMBER";

    // Info: (20260325 - Tzuhan) Find the target user by address
    const targetUser = await prisma.user.findUnique({ where: { address } });
    if (!targetUser) {
      return jsonFail(ApiCode.NOT_FOUND, "User with this address not found");
    }

    // Info: (20260325 - Tzuhan) Check if user is already a member
    const existingMember = await teamRepo.getTeamMember(targetUser.id, teamId);
    if (existingMember) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "User is already a member of this team");
    }

    const newMember = await teamRepo.createTeamMember({
      team: { connect: { id: teamId } },
      user: { connect: { id: targetUser.id } },
      role: assignedRole,
    });

    return jsonOk(newMember);
  } catch (error) {
    console.error("[API] /team/[teamId]/members POST error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
