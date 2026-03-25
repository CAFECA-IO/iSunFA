import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string, memberId: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { teamId, memberId } = params;

    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator || operator.role !== "OWNER") {
      return jsonFail(ApiCode.FORBIDDEN, "Permission denied. Only OWNER can modify roles.");
    }

    const body = await request.json();
    const { role } = body;

    if (!role || (role !== "OWNER" && role !== "ADMIN" && role !== "MEMBER")) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid role");
    }

    // Info: (20260325 - Tzuhan) Validate if the member exists and belongs to the team
    const targetMember = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!targetMember || targetMember.teamId !== teamId) {
      return jsonFail(ApiCode.NOT_FOUND, "Member not found in this team");
    }

    // Info: (20260325 - Tzuhan) If changing the target role to OWNER, operator might want to transfer, but typically we allow OWNER to make others OWNER.
    // Info: (20260325 - Tzuhan) However, if target is the last OWNER being changed to something else, we should prevent it.
    if (targetMember.role === "OWNER" && role !== "OWNER") {
      const ownersCount = await prisma.teamMember.count({
        where: { teamId, role: "OWNER" }
      });
      if (ownersCount <= 1) {
        return jsonFail(ApiCode.VALIDATION_ERROR, "Cannot change role of the last OWNER. Please transfer ownership first.");
      }
    }

    const updatedMember = await teamRepo.updateTeamMember(memberId, { role });
    return jsonOk(updatedMember);
  } catch (error) {
    console.error("[API] /team/[teamId]/members/[memberId] PATCH error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string, memberId: string } }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { teamId, memberId } = params;

    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator) {
      return jsonFail(ApiCode.FORBIDDEN, "Permission denied. You are not connected to this team.");
    }

    const targetMember = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!targetMember || targetMember.teamId !== teamId) {
      return jsonFail(ApiCode.NOT_FOUND, "Member not found in this team");
    }

    // Info: (20260325 - Tzuhan) Is the operator deleting themselves?
    const isSelfDelete = operator.id === targetMember.id;

    // Info: (20260325 - Tzuhan) Permission check
    // Info: (20260325 - Tzuhan) 1. You can delete yourself (leaving the team)
    // Info: (20260325 - Tzuhan) 2. OWNER can delete ANY user inside the team
    // Info: (20260325 - Tzuhan) 3. ADMIN can only delete MEMBER users inside the team
    if (!isSelfDelete) {
      if (operator.role === "MEMBER") {
        return jsonFail(ApiCode.FORBIDDEN, "Permission denied");
      }
      if (operator.role === "ADMIN" && (targetMember.role === "OWNER" || targetMember.role === "ADMIN")) {
        return jsonFail(ApiCode.FORBIDDEN, "ADMIN cannot remove other ADMIN or OWNER");
      }
    }

    // Info: (20260325 - Tzuhan) If removing an OWNER, ensure it is not the last OWNER
    if (targetMember.role === "OWNER") {
      const ownersCount = await prisma.teamMember.count({
        where: { teamId, role: "OWNER" }
      });
      if (ownersCount <= 1) {
        return jsonFail(ApiCode.VALIDATION_ERROR, "Cannot remove the last OWNER. Please transfer ownership or delete the team entirely.");
      }
    }

    const deletedMember = await teamRepo.deleteTeamMember(memberId);
    return jsonOk(deletedMember);
  } catch (error) {
    console.error("[API] /team/[teamId]/members/[memberId] DELETE error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
