import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { stringToHex } from "viem";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { bundlerService } from "@/services/bundler.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { resolveInviteEmailMatch } from "@/lib/team/invite_email_match";
import {
  canActOnInvitation,
  resolveRecipientKeys,
} from "@/services/team_invitation.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invite_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { invite_id: inviteId } = await params;
    const body = await request.json();
    const { authentication } = body;

    // Info: (20260326 - Tzuhan) Validate the invitation
    const found = await teamRepo.getInvitationByIdWithDetails(inviteId);

    /**
     * Info: (20260826 - Julian) 狀態、逾期、收件者三道走共用判定（review B1）。
     *
     * 原本是 `invitation.inviteeAddress !== sessionUser.address`，而 email 邀請
     * 那一欄是 NULL —— 於是 D19 把 email 邀請放進了鈴鐺與團隊頁，
     * 而這裡讓「接受」必定失敗。列得出來的東西必須是能操作的東西。
     *
     * 判定與查詢端同源（`resolveRecipientKeys`），因此不會出現
     * 「清單說這封是你的、接受時說不是」這種分岔 —— 那正是 B1 的成因。
     *
     * 逾期是這次一起補的：這支端點原本完全沒檢查。位址邀請不設 `expiresAt`，
     * 所以在舊路徑上看不出問題；email 邀請有 7 天期限，只放寬收件者判定
     * 而不補這一道，等於開放「逾期三個月的邀請仍可接受並佔一個付費席次」。
     */
    const keys = await resolveRecipientKeys({
      userId: sessionUser.id,
      address: sessionUser.address,
    });
    const check = canActOnInvitation({
      invitation: found,
      keys,
      nowMs: Date.now(),
    });
    if (!check.ok) return jsonFail(check.error);
    const invitation = check.invitation;

    if (!authentication) {
      return jsonFail(API_ERRORS.VL_MISSING_FIDO2);
    }

    // Info: (20260326 - Tzuhan) Fetch invitee's current challenge
    const inviteeUser = await webAuthnRepo.findUserById(sessionUser.id);
    if (!inviteeUser || !inviteeUser.currentChallenge) {
      return jsonFail(API_ERRORS.UN_MISSING_WEBAUTHN_CHALLENGE);
    }

    // Info: (20260326 - Tzuhan) Verify FIDO2 signature
    await webAuthnService.verifySignature(
      sessionUser.address,
      authentication,
      inviteeUser.currentChallenge,
    );

    // Info: (20260326 - Tzuhan) Clear challenge to prevent replay
    await webAuthnRepo.clearChallenge(sessionUser.id);

    // Info: (20260326 - Tzuhan) Accept invitation inside a transaction
    const newMember = await teamRepo.acceptInvitation({
      inviteId,
      teamId: invitation.teamId,
      userId: sessionUser.id,
      role: invitation.role,
      acceptedAt: new Date(),
      /**
       * Info: (20260826 - Julian) 稽核值**實際比對一次**，不從欄位有無推論（review R-4）。
       *
       * 原本寫的是 `invitation.inviteeEmail ? MATCHED : null` —— 拿「受邀信箱
       * 這一欄有值」代替「這次是靠哪一條判定通過的」。今天造不出兩欄皆有值的
       * 邀請，所以結論碰巧正確；但 `isIntendedRecipient` 自己就為同一種
       * 「今天造不出來」寫了防禦（兩欄皆空時的 `Boolean(...)`），
       * 兩處對同一類假設用兩套標準，遲早有一處被推翻。
       *
       * 走與 token 路徑同一支 `resolveInviteEmailMatch`：位址邀請回 null
       *（沒有受邀信箱，比對不適用），email 邀請依實際比對回值。
       * 稽核欄位記的是**觀測到的事**，不是從別的欄位推出來的事。
       *
       * ToDo: (20260826 - Julian) 這一筆目前是**準純寫入**：
       * `acceptedEmailMatch` 今天唯一的讀者是 `member_visibility.ts`，
       * 而它只讀 `MISMATCHED`。這條路徑寫進去的 `MATCHED` 沒有任何查詢、
       * 畫面或告警看得到 —— 沒有讀者的稽核欄位，稽核價值是零。
       * 要嘛給它一個讀者，要嘛承認它只是為了讓那一欄不說謊。
       */
      emailMatch: resolveInviteEmailMatch(
        invitation.inviteeEmail,
        keys.verifiedEmails,
      ),
    });

    /**
     * Info: (20260816 - Luphia) `null` = 這封邀請在上面那次讀取之後已經不是 PENDING
     * （連點兩次的第二次，或已被撤回）。當成「查無此邀請」回覆，
     * 而不是繼續往下送一筆鏈上訊息、回傳一個不存在的成員。
     */
    if (!newMember) {
      return jsonFail(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
    }

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
      signature: "0x",
    };

    try {
      await bundlerService.sendUserOp(
        dummyUserOp,
        CONTRACT_ADDRESSES.ENTRY_POINT,
      );
    } catch (e) {
      console.info(
        "[Simulated On-Chain] 'Accept Invite' UserOp submission failed as expected for dummy UserOp:",
        e,
      );
    }

    return jsonOk(newMember);
  } catch (error) {
    console.error(
      "[API] /team/invitations/[invite_id]/accept POST error:",
      error,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
