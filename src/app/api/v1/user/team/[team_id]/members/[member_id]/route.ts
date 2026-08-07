import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { revokeAllocationOnMemberRemoval } from "@/services/team_wallet.service";
import { stringToHex } from "viem";
import { jsonOk, jsonFail } from "@/lib/utils/response";
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
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
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
      return jsonFail(API_ERRORS.UN_MISSING_WEBAUTHN_CHALLENGE);
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
        return jsonFail(API_ERRORS.VA_CANNOT_CHANGE_ROLE_OF_THE_L);
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
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_YOU_ARE);
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
      return jsonFail(API_ERRORS.UN_MISSING_WEBAUTHN_CHALLENGE);
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
        return jsonFail(API_ERRORS.FO_ADMIN_CANNOT_REMOVE_OTHER_A);
      }
    }

    // Info: (20260325 - Tzuhan) If removing an OWNER, ensure it is not the last OWNER
    if (targetMember.role === "OWNER") {
      const ownersCount = await teamRepo.countTeamMembersByRole(
        teamId,
        "OWNER",
      );
      if (ownersCount <= 1) {
        return jsonFail(API_ERRORS.VA_CANNOT_REMOVE_THE_LAST_OWNE);
      }
    }

    /**
     * Info: (20260807 - Luphia) 成員移除前先全額收回其團隊分配點數（設計書 §6.2）。
     * 錢包凍結時丟錯中止移除（守恆優先）；冪等鍵綁 memberId，重試安全。
     */
    await revokeAllocationOnMemberRemoval({
      teamId,
      targetUserId: targetMember.userId,
      operatorUserId: sessionUser.id,
      memberId,
    });

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
    // Info: (20260807 - Luphia) 收回分配失敗（如錢包凍結）時回傳明確錯誤，而非籠統 500
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
