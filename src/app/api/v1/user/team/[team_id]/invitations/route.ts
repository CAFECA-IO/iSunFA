import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { stringToHex } from "viem";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { teamRepo } from "@/repositories/team.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { webAuthnService } from "@/services/webauthn.service";
import { bundlerService } from "@/services/bundler.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { TEAM_INVITATION_STATUS } from "@/constants/status";
import { isAddress } from "viem";
import { buildPendingInviteKey } from "@/lib/team/pending_invite_key";
import { canGrantRole, isTeamManagerRole, TeamRole } from "@/constants/team";
import { chargeSeatAddition } from "@/services/team_seat.service";
import { paymentRepo } from "@/repositories/payment.repo";
import type { IOenCallbackData } from "@/interfaces/payment";

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
    if (!isTeamManagerRole(operator?.role)) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
    }

    const body = await request.json();
    const { address, role, authentication } = body;

    /**
     * Info: (20260814 - Luphia) 位址要驗格式（PR #6652 第二輪 B-2）。
     *
     * 原本只驗 `typeof === "string"`，於是任意字串都能成為一次邀請——而付費團隊的
     * 每一次邀請都會向訂閱那張卡補收席次費用。不驗格式等於允許用亂數字串連續扣款。
     */
    if (!address || typeof address !== "string" || !isAddress(address)) {
      return jsonFail(API_ERRORS.VL_INVALID_ADDRESS);
    }

    if (!authentication) {
      return jsonFail(API_ERRORS.VL_MISSING_FIDO2);
    }

    // Info: (20260325 - Tzuhan) Fetch operator's current challenge
    const operatorUser = await webAuthnRepo.findUserById(sessionUser.id);
    if (!operatorUser || !operatorUser.currentChallenge) {
      return jsonFail(API_ERRORS.UN_MISSING_WEBAUTHN_CHALLENGE);
    }

    // Info: (20260325 - Tzuhan) Verify FIDO2 signature
    await webAuthnService.verifySignature(
      sessionUser.address,
      authentication,
      operatorUser.currentChallenge,
    );

    // Info: (20260325 - Tzuhan) Clear challenge to prevent replay
    await webAuthnRepo.clearChallenge(sessionUser.id);

    /**
     * Info: (20260819 - Luphia) 可授予的角色以列舉為準（團隊 ADMIN 已取消）。
     * 先前是手寫字串陣列，於是移除角色時這裡會被漏掉——列舉改了、這裡沒改，
     * 邀請仍然收得下一個已經不存在的角色。
     */
    /**
     * Info: (20260819 - Luphia) 不認識的角色一律**拒絕**，不要靜默降為 VIEWER
     * （review #6685 中-3）。
     *
     * 這條路徑會扣款。舊行為是「不認識就當 VIEWER」，於是：部署後 OWNER 的瀏覽器
     * 還跑著快取的舊 JS（邀請對話框仍列出 ADMIN 選項），或某個 integration 仍送
     * `role: "ADMIN"` → 流程走完 → **先扣一席的錢** → 建一封 VIEWER 邀請 → 回 200。
     * 團隊付了錢、拿到一個角色不對的成員，畫面沒有任何錯誤。
     *
     * 同一組功能的 `members/[member_id]` 對同樣的輸入是拒絕的——兩條路對同一個
     * 非法輸入給出兩種結果，本身就是缺陷。會扣款的路徑，fail-closed 的方向是拒絕。
     */
    if (!(Object.values(TeamRole) as string[]).includes(role)) {
      return jsonFail(API_ERRORS.AUTH_INVALID_ROLE);
    }
    const assignedRole = role as TeamRole;

    /**
     * Info: (20260818 - Luphia) 只有 OWNER 能授予 OWNER（第三輪 B-3）。
     * 與 email 邀請同一條規則；變更既有成員角色的端點早就有這道檢查。
     */
    if (!canGrantRole(operator?.role, assignedRole as TeamRole)) {
      return jsonFail(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
    }

    // Info: (20260325 - Tzuhan) Validate if the address is already a member
    const targetUser = await webAuthnRepo.findUserByAddress(address);
    if (targetUser) {
      const existingMember = await teamRepo.getTeamMember(
        targetUser.id,
        teamId,
      );
      if (existingMember) {
        return jsonFail(API_ERRORS.VA_USER_IS_ALREADY_A_MEMBER_OF);
      }
    }

    // Info: (20260325 - Tzuhan) Validate if an invitation already exists and is pending
    const existingInvite = await teamRepo.getTeamInvitation(
      teamId,
      address,
      TEAM_INVITATION_STATUS.PENDING,
    );

    if (existingInvite) {
      return jsonFail(API_ERRORS.VA_AN_INVITATION_IS_ALREADY_PE);
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

    /**
     * Info: (20260814 - Luphia) 付費團隊加人先補收席次費用（規範 §4「邀請即收費」、P3）。
     *
     * 順序是 fail-closed：扣款失敗就不建立邀請。反過來會出現「人已經進來、錢沒收到」，
     * 而那筆錢沒有任何流程會回頭補——只能人工追討。
     * 免費方案、期末零頭（補收金額為 0）不扣款，席次仍然照記。
     */
    const seatCharge = await chargeSeatAddition({
      teamId,
      seats: 1,
      nowMs: Date.now(),
      // Info: (20260814 - Luphia) 扣的是訂閱那張卡，記下是誰發動的（第二輪 B-2）
      operatorUserId: sessionUser.id,
      /**
       * Info: (20260814 - Luphia) 以「團隊 + 受邀位址」為冪等鍵（第二輪 B-3）：
       * 建立邀請失敗後客戶端重試同一位址時，不會再扣一次款。
       */
      idempotencyKey: `invite:${teamId}:${address.toLowerCase()}`,
    });

    // Info: (20260325 - Tzuhan) Create the TeamInvitation
    let newInvitation;
    try {
      newInvitation = await teamRepo.createTeamInvitation({
        teamId,
        inviterId: sessionUser.id,
        inviteeAddress: address,
        role: assignedRole,
        status: TEAM_INVITATION_STATUS.PENDING,
        /**
         * Info: (20260816 - Luphia) 併發防護，取代原本的 `@@unique([teamId, inviteeAddress, status])`。
         * 舊的複合鍵連 ACCEPTED 的歷史列一起約束，於是「移出團隊後再邀請同一個人」
         * 會在接受的那一刻撞鍵、永遠加不進來（見 pending_invite_key.ts）。
         */
        pendingKey: buildPendingInviteKey({ teamId, inviteeAddress: address }),
      });
    } catch (createError) {
      /**
       * Info: (20260814 - Luphia) 已扣款卻建不出邀請＝已收款未履行（第二輪 B-3）。
       *
       * 不標記的話這筆會停在 COMPLETED、席次也加了，而邀請不存在——沒有任何查詢
       * 篩得出它。這正是本分支花了不少篇幅消滅的靜默模式，席次路徑不能是例外。
       */
      if (seatCharge.orderId) {
        await paymentRepo.updateOrderMintFailed(
          seatCharge.orderId,
          { teamId, inviteeAddress: address },
          {} as IOenCallbackData,
          `invitation creation failed: ${
            createError instanceof Error
              ? createError.message
              : String(createError)
          }`,
        );
      }
      throw createError;
    }

    // Info: (20260814 - Luphia) 一併回報補收結果，前端才說得出「已補收 N 元」
    return jsonOk({ ...newInvitation, seatCharge });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    console.error("[API] /team/[team_id]/invitations POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ team_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    /**
     * Info: (20260813 - Luphia) 路由參數是 team_id，不是 teamId。
     * 取錯名字拿到的是 undefined，而 Prisma 會**忽略** where 裡的 undefined 欄位——
     * 於是這支端點原本回的是「全系統所有待接受邀請」，且權限檢查
     * getTeamMember(userId, undefined) 只要該用戶屬於任一團隊就通過。
     * 症狀是團隊頁把別的團隊寄給我的邀請畫成「我的團隊在邀請我」，
     * 而更嚴重的是它把其他團隊的受邀者位址一併吐了出來。
     */
    const { team_id: teamId } = await params;
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
