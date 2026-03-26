import { NextRequest } from "next/server";
import { stringToHex } from "viem";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { prisma } from "@/lib/prisma";
import { webAuthnService } from "@/services/webauthn.service";
import { bundlerService } from "@/services/bundler.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const { inviteId } = await params;
    const body = await request.json();
    const { authentication } = body;

    // Info: (20260326 - Tzuhan) Validate the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: inviteId },
      include: { team: true, inviter: true }
    });

    if (!invitation || invitation.status !== "PENDING") {
      return jsonFail(ApiCode.NOT_FOUND, "Invitation not found or no longer pending");
    }

    if (invitation.inviteeAddress !== sessionUser.address) {
      return jsonFail(ApiCode.FORBIDDEN, "You are not the intended recipient of this invitation");
    }

    if (!authentication) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Missing FIDO2 signature");
    }

    // Info: (20260326 - Tzuhan) Fetch invitee's current challenge
    const inviteeUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!inviteeUser || !inviteeUser.currentChallenge) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Missing WebAuthn challenge. Please retry.");
    }

    // Info: (20260326 - Tzuhan) Verify FIDO2 signature
    await webAuthnService.verifySignature(sessionUser.address, authentication, inviteeUser.currentChallenge);

    // Info: (20260326 - Tzuhan) Clear challenge to prevent replay
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { currentChallenge: null }
    });

    // Info: (20260326 - Tzuhan) Accept invitation inside a transaction
    const [newMember] = await prisma.$transaction([
      prisma.teamInvitation.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" }
      }),
      prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId: sessionUser.id,
          role: invitation.role
        }
      })
    ]);

    const inviterName = invitation.inviter.name || invitation.inviter.address;
    const inviteeName = sessionUser.name || sessionUser.address;
    const teamName = invitation.team.name;
    const contractMessage = `契約: ${inviteeName} 同意 ${inviterName} 發起加入 ${teamName} 團隊的邀請`;

    // Info: (20260325 - Tzuhan) [Option B] Simulate sending a UserOp to the blockchain for "Accepting Invite"
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
      console.info("[Simulated On-Chain] 'Accept Invite' UserOp submission failed as expected for dummy UserOp:", e);
    }

    return jsonOk(newMember);
  } catch (error) {
    console.error("[API] /team/invitations/[inviteId]/accept POST error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
