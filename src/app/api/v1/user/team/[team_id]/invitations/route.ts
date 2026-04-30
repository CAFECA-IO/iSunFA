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
import { TEAM_INVITATION_STATUS } from "@/constants/status";

export async function POST(
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

    // Info: (20260325 - Tzuhan) Check permission (OWNER or ADMIN)
    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator || (operator.role !== "OWNER" && operator.role !== "ADMIN")) {
      return jsonFail({
        code: "FO000099",
        message: "Permission denied. Only OWN...",
        status: ApiCode.FORBIDDEN,
      });
    }

    const body = await request.json();
    const { address, role, authentication } = body;

    if (!address || typeof address !== "string") {
      return jsonFail(API_ERRORS.VL_INVALID_ADDRESS);
    }

    if (!authentication) {
      return jsonFail(API_ERRORS.VL_MISSING_FIDO2);
    }

    // Info: (20260325 - Tzuhan) Fetch operator's current challenge
    const operatorUser = await webAuthnRepo.findUserById(sessionUser.id);
    if (!operatorUser || !operatorUser.currentChallenge) {
      return jsonFail({
        code: "UN000099",
        message: "Missing WebAuthn challenge....",
        status: ApiCode.UNAUTHORIZED,
      });
    }

    // Info: (20260325 - Tzuhan) Verify FIDO2 signature
    await webAuthnService.verifySignature(
      sessionUser.address,
      authentication,
      operatorUser.currentChallenge,
    );

    // Info: (20260325 - Tzuhan) Clear challenge to prevent replay
    await webAuthnRepo.clearChallenge(sessionUser.id);

    const assignedRole = ["OWNER", "ADMIN", "EDITOR", "VIEWER"].includes(role)
      ? role
      : "VIEWER";

    // Info: (20260325 - Tzuhan) Validate if the address is already a member
    const targetUser = await webAuthnRepo.findUserByAddress(address);
    if (targetUser) {
      const existingMember = await teamRepo.getTeamMember(
        targetUser.id,
        teamId,
      );
      if (existingMember) {
        return jsonFail({
          code: "VA000099",
          message: "User is already a member of...",
          status: ApiCode.VALIDATION_ERROR,
        });
      }
    }

    // Info: (20260325 - Tzuhan) Validate if an invitation already exists and is pending
    const existingInvite = await teamRepo.getTeamInvitation(
      teamId,
      address,
      TEAM_INVITATION_STATUS.PENDING,
    );

    if (existingInvite) {
      return jsonFail({
        code: "VA000099",
        message: "An invitation is already pe...",
        status: ApiCode.VALIDATION_ERROR,
      });
    }

    // Info: (20260325 - Tzuhan) Fetch team needed for the contract message
    const team = await teamRepo.getTeamById(teamId);
    const inviterName = sessionUser.name || sessionUser.address;
    const inviteeName = targetUser?.name || address;
    const teamName = team?.name || "Unknown Team";
    const contractMessage = `契約: ${inviterName} 發起讓 ${inviteeName} 加入 ${teamName} 團隊`;

    /**
     * Info: (20260325 - Tzuhan) [Option B] Simulate sending a UserOp to the blockchain for "Sending Invite"
     * Since we don't have the userOpHash signed, we send a dummy signature that will revert, but catch the error.
     */
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
        "[Simulated On-Chain] 'Send Invite' UserOp submission failed as expected for dummy UserOp:",
        e,
      );
    }

    // Info: (20260325 - Tzuhan) Create the TeamInvitation
    const newInvitation = await teamRepo.createTeamInvitation({
      teamId,
      inviterId: sessionUser.id,
      inviteeAddress: address,
      role: assignedRole,
      status: TEAM_INVITATION_STATUS.PENDING,
    });

    return jsonOk(newInvitation);
  } catch (error) {
    console.error("[API] /team/[team_id]/invitations POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { teamId } = await params;
    const operator = await teamRepo.getTeamMember(sessionUser.id, teamId);
    if (!operator) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const invitations = await teamRepo.listTeamInvitations(
      teamId,
      TEAM_INVITATION_STATUS.PENDING,
    );

    return jsonOk(invitations);
  } catch (error) {
    console.error("[API] /team/[team_id]/invitations GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
