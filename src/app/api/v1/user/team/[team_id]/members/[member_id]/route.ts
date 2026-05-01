import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { stringToHex } from "viem";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { bundlerService } from "@/services/bundler.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string; member_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { team_id: teamId, member_id: memberId } = await params;

    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator || operator.role !== "OWNER") {
      return jsonFail({
        code: "FO000099",
        message: "Permission denied. Only OWN...",
        status: ApiCode.FORBIDDEN,
      });
    }

    const body = await request.json();
    const { role, authentication } = body;

    if (!role || !["OWNER", "ADMIN", "EDITOR", "VIEWER"].includes(role)) {
      return jsonFail(API_ERRORS.AUTH_INVALID_ROLE);
    }

    if (!authentication) {
      return jsonFail(API_ERRORS.VL_MISSING_FIDO2);
    }

    // Info: (20260326 - Tzuhan) Fetch operator's current challenge
    const operatorUser = await webAuthnRepo.findUserById(sessionUser.id);
    if (!operatorUser || !operatorUser.currentChallenge) {
      return jsonFail({
        code: "UN000099",
        message: "Missing WebAuthn challenge....",
        status: ApiCode.UNAUTHORIZED,
      });
    }

    // Info: (20260326 - Tzuhan) Verify FIDO2 signature
    await webAuthnService.verifySignature(
      sessionUser.address,
      authentication,
      operatorUser.currentChallenge,
    );

    // Info: (20260326 - Tzuhan) Clear challenge to prevent replay
    await webAuthnRepo.clearChallenge(sessionUser.id);

    // Info: (20260325 - Tzuhan) Validate if the member exists and belongs to the team
    const targetMember = await teamRepo.getTeamMemberById(memberId);
    if (!targetMember || targetMember.teamId !== teamId) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260325 - Tzuhan) If changing the target role to OWNER, operator might want to transfer, but typically we allow OWNER to make others OWNER.
    // Info: (20260325 - Tzuhan) However, if target is the last OWNER being changed to something else, we should prevent it.
    if (targetMember.role === "OWNER" && role !== "OWNER") {
      const ownersCount = await teamRepo.countTeamMembersByRole(
        teamId,
        "OWNER",
      );
      if (ownersCount <= 1) {
        return jsonFail({
          code: "VA000099",
          message: "Cannot change role of the l...",
          status: ApiCode.VALIDATION_ERROR,
        });
      }
    }

    const updatedMember = await teamRepo.updateTeamMember(memberId, { role });

    // Info: (20260325 - Tzuhan) simulated on-chain record for role change
    const team = await teamRepo.getTeamById(teamId);
    const operatorName = sessionUser.name || sessionUser.address;
    const targetName = targetMember.userId;
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
      signature: "0x",
    };

    try {
      await bundlerService.sendUserOp(
        dummyUserOp,
        CONTRACT_ADDRESSES.ENTRY_POINT,
      );
    } catch (e) {
      console.info(
        "[Simulated On-Chain] 'Change Role' UserOp submission failed as expected for dummy UserOp:",
        e,
      );
    }

    return jsonOk(updatedMember);
  } catch (error) {
    console.error(
      "[API] /team/[team_id]/members/[member_id] PATCH error:",
      error,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string; member_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { team_id: teamId, member_id: memberId } = await params;

    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator) {
      return jsonFail({
        code: "FO000099",
        message: "Permission denied. You are ...",
        status: ApiCode.FORBIDDEN,
      });
    }

    const targetMember = await teamRepo.getTeamMemberById(memberId);
    if (!targetMember || targetMember.teamId !== teamId) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const body = await request.json();
    const { authentication } = body;

    if (!authentication) {
      return jsonFail(API_ERRORS.VL_MISSING_FIDO2);
    }

    // Info: (20260326 - Tzuhan) Fetch operator's current challenge
    const operatorUser = await webAuthnRepo.findUserById(sessionUser.id);
    if (!operatorUser || !operatorUser.currentChallenge) {
      return jsonFail({
        code: "UN000099",
        message: "Missing WebAuthn challenge....",
        status: ApiCode.UNAUTHORIZED,
      });
    }

    // Info: (20260326 - Tzuhan) Verify FIDO2 signature
    await webAuthnService.verifySignature(
      sessionUser.address,
      authentication,
      operatorUser.currentChallenge,
    );

    // Info: (20260326 - Tzuhan) Clear challenge to prevent replay
    await webAuthnRepo.clearChallenge(sessionUser.id);

    // Info: (20260325 - Tzuhan) Is the operator deleting themselves?
    const isSelfDelete = operator.id === targetMember.id;

    // Info: (20260325 - Tzuhan) Permission check
    // Info: (20260325 - Tzuhan) 1. You can delete yourself (leaving the team)
    // Info: (20260325 - Tzuhan) 2. OWNER can delete ANY user inside the team
    // Info: (20260325 - Tzuhan) 3. ADMIN can only delete MEMBER users inside the team
    if (!isSelfDelete) {
      if (operator.role === "EDITOR" || operator.role === "VIEWER") {
        return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
      }
      if (
        operator.role === "ADMIN" &&
        (targetMember.role === "OWNER" || targetMember.role === "ADMIN")
      ) {
        return jsonFail({
          code: "FO000099",
          message: "ADMIN cannot remove other A...",
          status: ApiCode.FORBIDDEN,
        });
      }
    }

    // Info: (20260325 - Tzuhan) If removing an OWNER, ensure it is not the last OWNER
    if (targetMember.role === "OWNER") {
      const ownersCount = await teamRepo.countTeamMembersByRole(
        teamId,
        "OWNER",
      );
      if (ownersCount <= 1) {
        return jsonFail({
          code: "VA000099",
          message: "Cannot remove the last OWNE...",
          status: ApiCode.VALIDATION_ERROR,
        });
      }
    }

    const deletedMember = await teamRepo.deleteTeamMember(memberId);

    // Info: (20260326 - Tzuhan) simulated on-chain record for member deletion
    const team = await teamRepo.getTeamById(teamId);
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
      signature: "0x",
    };

    try {
      await bundlerService.sendUserOp(
        dummyUserOp,
        CONTRACT_ADDRESSES.ENTRY_POINT,
      );
    } catch (e) {
      console.info(
        "[Simulated On-Chain] 'Delete Member' UserOp submission failed as expected for dummy UserOp:",
        e,
      );
    }

    return jsonOk(deletedMember);
  } catch (error) {
    console.error(
      "[API] /team/[team_id]/members/[member_id] DELETE error:",
      error,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
