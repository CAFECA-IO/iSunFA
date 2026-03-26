import { NextRequest } from "next/server";
import { stringToHex } from "viem";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { prisma } from "@/lib/prisma";
import { webAuthnService } from "@/services/webauthn.service";
import { bundlerService } from "@/services/bundler.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string, memberId: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { teamId, memberId } = await params;

    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator || operator.role !== "OWNER") {
      return jsonFail(ApiCode.FORBIDDEN, "Permission denied. Only OWNER can modify roles.");
    }

    const body = await request.json();
    const { role, authentication } = body;

    if (!role || !["OWNER", "ADMIN", "EDITOR", "VIEWER"].includes(role)) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid role");
    }

    if (!authentication) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Missing FIDO2 signature");
    }

    // Info: (20260326 - Tzuhan) Fetch operator's current challenge
    const operatorUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!operatorUser || !operatorUser.currentChallenge) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Missing WebAuthn challenge. Please retry.");
    }

    // Info: (20260326 - Tzuhan) Verify FIDO2 signature
    await webAuthnService.verifySignature(sessionUser.address, authentication, operatorUser.currentChallenge);

    // Info: (20260326 - Tzuhan) Clear challenge to prevent replay
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { currentChallenge: null }
    });

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

    // Info: (20260325 - Tzuhan) simulated on-chain record for role change
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    const operatorName = sessionUser.name || sessionUser.address;
    const targetName = targetMember.userId; // we could fetch name but userId works for simulation
    const teamName = team?.name || "Unknown Team";
    const contractMessage = `契約: ${operatorName} 更改了 ${targetName} 在 ${teamName} 團隊的角色為 ${role}`;

    const dummyUserOp = {
      sender: sessionUser.address,
      nonce: BigInt(0),
      initCode: "0x",
      callData: stringToHex(contractMessage),
      callGasLimit: BigInt(50000),
      verificationGasLimit: BigInt(100000),
      preVerificationGas: BigInt(21000),
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
      paymasterAndData: "0x",
      signature: "0x"
    };

    try {
      await bundlerService.sendUserOp(dummyUserOp, CONTRACT_ADDRESSES.ENTRY_POINT);
    } catch (e) {
      console.info("[Simulated On-Chain] 'Change Role' UserOp submission failed as expected for dummy UserOp:", e);
    }

    return jsonOk(updatedMember);

  } catch (error) {
    console.error("[API] /team/[teamId]/members/[memberId] PATCH error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string, memberId: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { teamId, memberId } = await params;

    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator) {
      return jsonFail(ApiCode.FORBIDDEN, "Permission denied. You are not connected to this team.");
    }

    const targetMember = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!targetMember || targetMember.teamId !== teamId) {
      return jsonFail(ApiCode.NOT_FOUND, "Member not found in this team");
    }

    const body = await request.json();
    const { authentication } = body;

    if (!authentication) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Missing FIDO2 signature");
    }

    // Info: (20260326 - Tzuhan) Fetch operator's current challenge
    const operatorUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!operatorUser || !operatorUser.currentChallenge) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Missing WebAuthn challenge. Please retry.");
    }

    // Info: (20260326 - Tzuhan) Verify FIDO2 signature
    await webAuthnService.verifySignature(sessionUser.address, authentication, operatorUser.currentChallenge);

    // Info: (20260326 - Tzuhan) Clear challenge to prevent replay
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { currentChallenge: null }
    });

    // Info: (20260325 - Tzuhan) Is the operator deleting themselves?
    const isSelfDelete = operator.id === targetMember.id;

    // Info: (20260325 - Tzuhan) Permission check
    // Info: (20260325 - Tzuhan) 1. You can delete yourself (leaving the team)
    // Info: (20260325 - Tzuhan) 2. OWNER can delete ANY user inside the team
    // Info: (20260325 - Tzuhan) 3. ADMIN can only delete MEMBER users inside the team
    if (!isSelfDelete) {
      if (operator.role === "EDITOR" || operator.role === "VIEWER") {
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

    // Info: (20260326 - Tzuhan) simulated on-chain record for member deletion
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    const operatorName = sessionUser.name || sessionUser.address;
    const targetName = targetMember.userId;
    const teamName = team?.name || "Unknown Team";
    const contractMessage = `契約: ${operatorName} 將 ${targetName} 從 ${teamName} 團隊中移除`;

    const dummyUserOp = {
      sender: sessionUser.address,
      nonce: BigInt(0),
      initCode: "0x",
      callData: stringToHex(contractMessage),
      callGasLimit: BigInt(50000),
      verificationGasLimit: BigInt(100000),
      preVerificationGas: BigInt(21000),
      maxFeePerGas: BigInt(0),
      maxPriorityFeePerGas: BigInt(0),
      paymasterAndData: "0x",
      signature: "0x"
    };

    try {
      await bundlerService.sendUserOp(dummyUserOp, CONTRACT_ADDRESSES.ENTRY_POINT);
    } catch (e) {
      console.info("[Simulated On-Chain] 'Delete Member' UserOp submission failed as expected for dummy UserOp:", e);
    }

    return jsonOk(deletedMember);

  } catch (error) {
    console.error("[API] /team/[teamId]/members/[memberId] DELETE error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
