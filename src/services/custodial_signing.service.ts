import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { WalletCustodyType } from "@/constants/auth_provider";
import { ORDER_STATUS } from "@/constants/status";
import { signChallenge } from "@/lib/auth/custodial_signer";
import { openSecret, VaultPurpose } from "@/lib/auth/key_vault";
import { verifyChallengeToken } from "@/lib/auth/challenge_token";
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
 * 1. userOp 模式：雜湊由伺服器向 EntryPoint 重新計算，且 sender 必須是該使用者的 SCW。
 * 2. challenge 模式：必須對得上使用者的 currentChallenge、自己某張未付款訂單的
 *    challenge，或一枚由本站簽發且未過期的 challengeToken。
 *
 * 對不上就拒絕。前端不必為此改變任何行為——這些 challenge 本來就是它手上那一份。
 */

export interface ICustodialSignParams {
  user: IUser;
  challenge?: string;
  userOp?: UserOperationJson;
  challengeToken?: string;
}

export class CustodialSigningService {
  constructor(private readonly keyRepo: ICustodialKeyRepository) {}

  public async sign(params: ICustodialSignParams): Promise<AuthenticationJSON> {
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
     * Info: (20260810 - Luphia) 決定要簽的 challenge，兩種來源都必須經過出處驗證。
     * userOp 模式由錢包服務重算雜湊並比對 sender；challenge 模式必須對得上
     * 本站發出過的值。兩者之後走同一條簽章路徑。
     */
    let challenge: string;

    if (params.userOp) {
      challenge = await custodialWalletService.resolveUserOpChallenge(
        user.id,
        params.userOp,
      );
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

    // Info: (20260810 - Luphia) 每一次代簽都留紀錄：這類授權沒有第二因素，紀錄是唯一的事後追查依據
    logger.info("Custodial assertion issued", {
      userId: user.id,
      address: user.address,
      challenge,
    });

    return this.toAuthenticationJSON(record.credentialId, assertion);
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
      const expected = await verifyChallengeToken(challengeToken);
      if (expected === challenge) return;
    }

    // Info: (20260810 - Luphia) 3. 使用者自己某張未付款訂單的 challenge
    const order = await paymentRepo.findOrderByUserAndChallenge(
      user.id,
      challenge,
      [ORDER_STATUS.PENDING, ORDER_STATUS.PAYING],
    );
    if (order) return;

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
