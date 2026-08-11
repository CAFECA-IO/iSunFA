import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { WalletCustodyType } from "@/constants/auth_provider";
import { ORDER_STATUS } from "@/constants/status";
import { signChallenge } from "@/lib/auth/custodial_signer";
import { openSecret, VaultPurpose } from "@/lib/auth/key_vault";
import { inspectChallengeToken } from "@/lib/auth/challenge_token";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import { resolveCustodyType } from "@/lib/auth/user_approval";
import {
  custodialKeyRepo,
  ICustodialKeyRepository,
} from "@/repositories/custodial_key.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { custodialWalletService } from "@/services/custodial_wallet.service";
import { IUser } from "@/interfaces/user";
import { UserOperationJson } from "@/validators";

/**
 * Info: (20260810 - Luphia) 託管帳號的簽章服務——前端 fido2ClientService.startLogin() 的替代品。
 *
 * 回傳的是一份真正的 WebAuthn assertion（由託管金鑰簽出，公鑰就是 User.pubKeyX/pubKeyY），
 * 因此所有既有流程維持「必須有有效簽章」，不需要為託管帳號開任何繞過邏輯。
 *
 * ── 為什麼這不是簽章預言機 ──
 * 一支「你給什麼雜湊我就簽」的端點，等於讓任何拿到 session 的人（例如一次 XSS）
 * 簽出把錢包掏空的 UserOp。因此這裡只簽「伺服器自己發出過」的 challenge：
 *
 * 1. orderId 模式：呼叫端只指名一張自己的未付款訂單，UserOp 的每一個欄位
 *    （收款方、金額、nonce、gas）都由伺服器決定，雜湊自然也是伺服器算的。
 * 2. challenge 模式：必須對得上使用者的 currentChallenge、自己某張未付款訂單的
 *    challenge（且格式須為伺服器產生的 43 字元 base64url），
 *    或一枚由本站簽發、綁定本人、且用途不是管理員操作的 challengeToken。
 *
 * 對不上就拒絕。前端不必為此改變任何行為——這些 challenge 本來就是它手上那一份。
 */

export interface ICustodialSignParams {
  user: IUser;
  challenge?: string;
  // Info: (20260811 - Luphia) 付款流程只給訂單編號，UserOp 由伺服器自行組出
  orderId?: string;
  challengeToken?: string;
}

export interface ICustodialSignResult {
  assertion: AuthenticationJSON;
  /**
   * Info: (20260811 - Luphia) orderId 模式才有：伺服器實際簽下去的那份 UserOp。
   * 呼叫端必須原封提交這一份，簽章才對得上——這也是「伺服器決定交易內容」的落實方式。
   */
  userOp?: UserOperationJson;
}

/**
 * Info: (20260811 - Luphia) 訂單 challenge 的格式門檻：32 bytes 的 base64url ＝ 43 字元。
 * 系統內有幾張訂單把 challenge 寫成 "N/A" / "registration" / "admin_distribute"
 * 這類常數，少了這道檢查就會變成「可無限重複代簽的固定字串」。
 */
const SERVER_ISSUED_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export class CustodialSigningService {
  constructor(private readonly keyRepo: ICustodialKeyRepository) {}

  public async sign(
    params: ICustodialSignParams,
  ): Promise<ICustodialSignResult> {
    const { user } = params;

    /**
     * Info: (20260810 - Luphia) 只服務託管帳號。
     * passkey 使用者的私鑰在他自己的裝置裡，伺服器代簽不僅做不到，
     * 若這裡對他們回傳任何東西也只會削弱他們原本較強的保護。
     */
    const custody = await resolveCustodyType(user.id);
    if (custody !== WalletCustodyType.CUSTODIAL) {
      throw new AppError(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    /**
     * Info: (20260811 - Luphia) 決定要簽的 challenge，兩種來源都不接受呼叫端指定內容。
     * orderId 模式由錢包服務自行組出 UserOp 並算雜湊；challenge 模式必須對得上
     * 本站發出過的值。兩者之後走同一條簽章路徑。
     */
    let challenge: string;
    let userOp: UserOperationJson | undefined;

    if (params.orderId) {
      const built = await custodialWalletService.buildOrderPaymentUserOp(
        user.id,
        params.orderId,
      );
      challenge = built.challenge;
      userOp = built.userOp;
    } else {
      if (!params.challenge) {
        throw new AppError(API_ERRORS.VL_MISSING_PARAMS);
      }
      challenge = params.challenge;
      await this.assertChallengeIssuedByUs(
        user,
        challenge,
        params.challengeToken,
      );
    }

    const record = await this.keyRepo.findByUserId(user.id);
    if (!record) {
      throw new AppError(API_ERRORS.AUTH_CUSTODIAL_KEY_MISSING);
    }

    // Info: (20260810 - Luphia) 明文私鑰的生命週期僅限這幾行
    const privateKeyPem = openSecret(
      {
        ciphertext: record.encryptedPrivateKey,
        iv: record.iv,
        authTag: record.authTag,
        keyVersion: record.keyVersion,
      },
      VaultPurpose.CUSTODIAL_KEY,
    );

    const assertion = signChallenge(privateKeyPem, challenge);

    /**
     * Info: (20260811 - Luphia) 每一次代簽都留紀錄：這類授權沒有第二因素，紀錄是唯一的事後追查依據。
     * challenge 在付款模式下只是一個雜湊，光記它事後看不出簽掉了什麼，
     * 因此連同模式、訂單、實際的收款目標與金額一起記。
     */
    logger.info("Custodial assertion issued", {
      userId: user.id,
      address: user.address,
      mode: params.orderId ? "ORDER_PAYMENT" : "CHALLENGE",
      orderId: params.orderId ?? "",
      challenge,
      sender: userOp?.sender ?? "",
      nonce: userOp?.nonce ?? "",
      callData: userOp?.callData ?? "",
    });

    return {
      assertion: this.toAuthenticationJSON(record.credentialId, assertion),
      userOp,
    };
  }

  /**
   * Info: (20260810 - Luphia) 確認 challenge 真的是本站發給這位使用者的。
   * 三種來源都必須綁定到該使用者本人，避免拿別人的 challenge 來借簽。
   */
  private async assertChallengeIssuedByUs(
    user: IUser,
    challenge: string,
    challengeToken?: string,
  ): Promise<void> {
    // Info: (20260810 - Luphia) 1. 登入／操作 nonce（/auth/options 發的）
    const dbUser = await webAuthnRepo.findUserById(user.id);
    if (dbUser?.currentChallenge && dbUser.currentChallenge === challenge) {
      return;
    }

    // Info: (20260810 - Luphia) 2. 本站簽發的短效 challengeToken（優惠券等流程用）
    if (challengeToken) {
      const inspected = await inspectChallengeToken(challengeToken);

      /**
       * Info: (20260811 - Luphia) 管理員操作一律不代簽。
       *
       * 託管帳號的「同意」就只是一張 session cookie；讓它能授權改金流憑證、發點數
       * 這類操作，等於把最高權限的第二因素整個拿掉。管理員帳號本來就不該是託管型，
       * 這裡明確拒絕，讓這個前提變成程式碼而不是口頭約定。
       */
      if (inspected.purpose === ChallengePurpose.ADMIN_ACTION) {
        logger.error(
          "Refusing to custodially sign an admin-purpose challenge",
          {
            userId: user.id,
          },
        );
        throw new AppError(API_ERRORS.AUTH_PERMISSION_DENIED);
      }

      // Info: (20260811 - Luphia) token 必須是發給這個人的，不能拿別人的來借簽
      if (inspected.sub && inspected.sub !== user.id) {
        throw new AppError(API_ERRORS.AUTH_PERMISSION_DENIED);
      }

      if (inspected.challenge === challenge) return;
    }

    /**
     * Info: (20260810 - Luphia) 3. 使用者自己某張未付款訂單的 challenge。
     *
     * Info: (20260811 - Luphia) 只認 PENDING，且 challenge 必須是 43 字元的 base64url。
     *
     * 系統內有幾處訂單把 challenge 寫成固定字串（綁卡的 "N/A"、註冊的 "registration"、
     * 管理員發點數的 "admin_distribute"）。少了格式門檻，任何託管使用者只要建一張
     * 綁卡訂單，之後就能無限次要求伺服器簽 "N/A" 這個常數。真正由伺服器產生的訂單
     * challenge 一律是 sha256 的 base64url，長度固定 43。
     */
    if (SERVER_ISSUED_CHALLENGE_PATTERN.test(challenge)) {
      const order = await paymentRepo.findOrderByUserAndChallenge(
        user.id,
        challenge,
        [ORDER_STATUS.PENDING],
      );
      if (order) return;
    }

    logger.error("Refusing to sign an unrecognised challenge", {
      userId: user.id,
      challenge,
    });
    throw new AppError(API_ERRORS.AUTH_CHALLENGE_NOT_RECOGNISED);
  }

  // Info: (20260810 - Luphia) 組成前端既有處理流程認得的 AuthenticationJSON 形狀
  private toAuthenticationJSON(
    credentialId: string,
    assertion: ReturnType<typeof signChallenge>,
  ): AuthenticationJSON {
    return {
      id: credentialId,
      rawId: credentialId,
      type: "public-key",
      authenticatorAttachment: "platform",
      clientExtensionResults: {},
      response: {
        authenticatorData: Buffer.from(
          assertion.authenticatorData.slice(2),
          "hex",
        ).toString("base64url"),
        clientDataJSON: Buffer.from(
          assertion.clientDataJSON.slice(2),
          "hex",
        ).toString("base64url"),
        signature: derEncodeSignature(assertion.r, assertion.s),
        userHandle: undefined,
      },
    } as unknown as AuthenticationJSON;
  }
}

/**
 * Info: (20260810 - Luphia) 把 (r, s) 重新編成 DER。
 * 真實的 WebAuthn authenticator 回傳的 signature 是 DER 編碼，而前端的
 * getWebAuthnSignatureStruct 正是依 DER 解析——格式必須一致，否則前端解不開。
 */
function derEncodeSignature(r: bigint, s: bigint): string {
  const toDerInteger = (value: bigint): Buffer => {
    let hex = value.toString(16);
    if (hex.length % 2 !== 0) hex = `0${hex}`;
    let bytes = Buffer.from(hex, "hex");
    // Info: (20260810 - Luphia) DER 的 INTEGER 是有號數，最高位為 1 時要補一個 0x00
    if (bytes[0] & 0x80) bytes = Buffer.concat([Buffer.from([0x00]), bytes]);
    return Buffer.concat([Buffer.from([0x02, bytes.length]), bytes]);
  };

  const body = Buffer.concat([toDerInteger(r), toDerInteger(s)]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body]).toString(
    "base64url",
  );
}

export const custodialSigningService = new CustodialSigningService(
  custodialKeyRepo,
);
