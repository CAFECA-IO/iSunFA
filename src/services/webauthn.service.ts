import type {
  RegistrationJSON,
  AuthenticationJSON,
  CredentialInfo,
} from "@passwordless-id/webauthn/dist/esm/types";
import {
  verifyAuthentication,
  verifyRegistration,
} from "@/lib/auth/fido2_server";
import { signDeWT } from "@/lib/auth/dewt";
import type { IWebAuthnRepository } from "@/repositories/webauthn.repo";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { AppError } from "@/lib/utils/error";
import { ApiCode } from "@/lib/utils/status";
import {
  extractXYFromSPKI,
  reconstructKeyFromXY,
} from "@/lib/auth/crypto_utils";
import { randomBytes } from "crypto";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import {
  generateChallengeToken,
  verifyChallengeToken,
} from "@/lib/auth/challenge_token";
import { IUser } from "@/interfaces/user";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { deriveAccountAddress } from "@/lib/auth/account_address";

interface ILoginResult {
  dewt: string;
  user: {
    address: string;
    name: string | null;
    role: string;
  };
}

interface IParsedPublicKey {
  x: string;
  y: string;
  credentialID: string;
}

export interface IPasskeyRegistrationResult {
  address: string;
  name: string | null;
}

// Info: (20261015 - Luphia) 使用者未填暱稱時的保底值（與舊版鏈上建帳的預設一致）
const DEFAULT_PASSKEY_AVATAR_URL = "default_avatar_url";

class WebAuthnService {
  constructor(private readonly repo: IWebAuthnRepository) {}

  public async generateLoginOptions(address: string): Promise<string> {
    const user = await this.ensureUserSynced(address);

    if (!user) {
      throw new AppError({
        code: "NO000099",
        message: String("User not found. Please register first.").slice(0, 30),
        status: ApiCode.NOT_FOUND,
      });
    }

    const challenge = randomBytes(32).toString("base64url");
    await this.repo.updateChallenge(address, challenge);

    return challenge;
  }

  /**
   * Info: (20251226 - Tzuhan)
   * [Step 2] 驗證登入
   */
  public async loginWithAddress(
    address: string,
    authenticationData: AuthenticationJSON,
  ): Promise<ILoginResult> {
    const user = await this.repo.findUserByAddress(address);

    if (!user || !user.pubKeyX || !user.pubKeyY || !user.currentChallenge) {
      throw new AppError({
        code: "NO000099",
        message: String("User data incomplete. Please retry login flow.").slice(
          0,
          30,
        ),
        status: ApiCode.NOT_FOUND,
      });
    }

    const credentialPublicKey = reconstructKeyFromXY(
      user.pubKeyX,
      user.pubKeyY,
    );

    const credential: CredentialInfo = {
      id: authenticationData.id,
      publicKey: credentialPublicKey,
      algorithm: "ES256",
      transports: [],
    };

    try {
      await verifyAuthentication(
        authenticationData,
        credential,
        user.currentChallenge,
      );
    } catch (error) {
      console.error("Login verification failed:", error);
      throw new AppError({
        code: "UN000099",
        message: "Invalid signature",
        status: ApiCode.UNAUTHORIZED,
      });
    }

    const dewt = await signDeWT(user);
    // Info: (20260123 - Tzuhan) DB 壞掉時這步可能會失敗，但登入應該要算成功
    try {
      await this.repo.updateChallenge(address, "");
    } catch (e) {
      console.warn(
        "[Login] Failed to clear challenge in DB (Non-critical):",
        e,
      );
    }

    return {
      dewt,
      user: {
        address: user.address,
        name: user.name,
        role: user.role,
      },
    };
  }

  public async parseRegistrationCredential(
    registrationData: RegistrationJSON,
    expectedChallenge: string,
  ): Promise<IParsedPublicKey> {
    const verification = await verifyRegistration(
      registrationData,
      expectedChallenge,
    );
    const { x, y } = extractXYFromSPKI(verification.credential.publicKey);
    return {
      x: x.toString(),
      y: y.toString(),
      credentialID: verification.credential.id,
    };
  }

  /**
   * Info: (20261015 - Luphia) 區塊鏈退役：DB 是唯一真相，這裡只查 DB。
   *
   * 原本 DB 查不到（或 DB 掛掉）時會去鏈上撈 AccountCreated 事件補建使用者（lazy sync），
   * 甚至在 DB 寫入失敗時回傳一個 id 為 "ephemeral_id" 的臨時物件讓流程繼續。
   * 鏈已損毀，那條救援路徑只會逾時；而臨時物件會讓下游拿一個不存在的 userId 寫資料。
   * DB 錯誤現在照實拋出，不偽裝成「查無此人」——後者會把使用者導去重新註冊。
   * 名稱保留（呼叫端眾多），語意已是單純的查詢。
   */
  public async ensureUserSynced(address: string): Promise<IUser | null> {
    return this.repo.findUserByAddress(address);
  }

  /**
   * Info: (20261015 - Luphia) Passkey 註冊用的 challenge（綁 REGISTER 用途的短效 token）。
   * 原本註冊 challenge 是一串不簽章的亂數，由前端原封送回；現在建帳發生在伺服器，
   * 驗證端必須確認 challenge 真的是本站為註冊發出的。
   */
  public async generateRegistrationOptions() {
    return await generateChallengeToken(ChallengePurpose.REGISTER);
  }

  /**
   * Info: (20261015 - Luphia) Passkey 註冊：驗證 → 推導位址 → 寫入 DB（區塊鏈退役）。
   *
   * 取代原本「前端預測 SCW 位址 → 二次簽名 → bundler 部署 → 伺服器從鏈上 lazy sync 建帳」。
   * 位址改由 `deriveAccountAddress` 鏈下決定性推導，不再需要第二次簽名。
   */
  public async registerWithPasskey(params: {
    registration: RegistrationJSON;
    challengeToken: string;
    name: string;
  }): Promise<IPasskeyRegistrationResult> {
    let expectedChallenge: string;
    try {
      expectedChallenge = await verifyChallengeToken(
        params.challengeToken,
        ChallengePurpose.REGISTER,
      );
    } catch {
      throw new AppError(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const parsed = await this.parseRegistrationCredential(
      params.registration,
      expectedChallenge,
    );

    return this.createAccountForKey({
      credentialId: parsed.credentialID,
      pubKeyX: parsed.x,
      pubKeyY: parsed.y,
      name: params.name,
    });
  }

  /**
   * Info: (20261015 - Luphia) 以一把**已驗證過**的公鑰建立帳號：推導位址並寫入 DB。
   *
   * 不做任何 WebAuthn 驗證——呼叫端必須自己確認金鑰來源：
   * `registerWithPasskey` 先跑 verifyRegistration；整合測試機器人的金鑰由它自己從 seed 產生。
   * 刻意不開放任何 API 端點直接呼叫這一支，否則任何人都能替任意公鑰開帳號。
   *
   * 同一個 credentialId 只能註冊一次：重複時明確拒絕，而不是靜默覆寫既有帳號的公鑰。
   */
  public async createAccountForKey(params: {
    credentialId: string;
    pubKeyX: string;
    pubKeyY: string;
    name: string;
  }): Promise<IPasskeyRegistrationResult> {
    const existing = await this.repo.findUserByCredentialId(
      params.credentialId,
    );
    if (existing) {
      throw new AppError(API_ERRORS.AUTH_PASSKEY_ALREADY_REGISTERED);
    }

    const address = deriveAccountAddress({
      credentialId: params.credentialId,
      pubKeyX: params.pubKeyX,
      pubKeyY: params.pubKeyY,
    });

    /**
     * Info: (20261015 - Luphia) 位址由 credentialId 與公鑰推導，撞到既有位址只可能是
     * 同一把金鑰（上面已擋）或 160-bit 碰撞；兩者都不可以覆寫別人的帳號。
     */
    const occupied = await this.repo.findUserByAddress(address);
    if (occupied) {
      throw new AppError(API_ERRORS.AUTH_PASSKEY_ALREADY_REGISTERED);
    }

    const user = await this.repo.upsertUser({
      address,
      pubKeyX: params.pubKeyX,
      pubKeyY: params.pubKeyY,
      credentialId: params.credentialId,
      name: params.name,
      imageUrl: DEFAULT_PASSKEY_AVATAR_URL,
    });

    return { address: user.address, name: user.name };
  }

  // Info: (20260811 - Luphia) purpose / sub 由呼叫端指定，見 challenge_token
  public async generateStatelessLoginOptions(
    purpose: ChallengePurpose = ChallengePurpose.LOGIN,
    sub?: string,
  ) {
    return await generateChallengeToken(purpose, sub);
  }

  // Info: (20260105 - Tzuhan) [核心修改] 處理無地址登入 (Discoverable Login)
  public async loginWithCredential(
    challengeToken: string,
    authenticationData: AuthenticationJSON,
  ): Promise<ILoginResult> {
    // Info: (20260811 - Luphia) 登入用的 token 不得拿去授權其他操作，反之亦然
    const expectedChallenge = await verifyChallengeToken(
      challengeToken,
      ChallengePurpose.LOGIN,
    );

    /**
     * Info: (20261015 - Luphia) 只查 DB（區塊鏈退役）。原本 DB 查不到或連線失敗時
     * 會改去鏈上以 credentialId 救援；DB 錯誤現在照實拋出，不偽裝成「查無此人」。
     */
    const user = await this.repo.findUserByCredentialId(authenticationData.id);

    if (!user || !user.pubKeyX || !user.pubKeyY) {
      throw new AppError({
        code: "NO000099",
        message: String("User not found or passkey not registered").slice(
          0,
          30,
        ),
        status: ApiCode.NOT_FOUND,
      });
    }

    const credentialPublicKey = reconstructKeyFromXY(
      user.pubKeyX,
      user.pubKeyY,
    );
    const credential: CredentialInfo = {
      id: authenticationData.id,
      publicKey: credentialPublicKey,
      algorithm: "ES256",
      transports: [],
    };

    try {
      await verifyAuthentication(
        authenticationData,
        credential,
        expectedChallenge,
      );
    } catch (error) {
      console.error("Login verification failed:", error);
      throw new AppError({
        code: "UN000099",
        message: "Invalid signature",
        status: ApiCode.UNAUTHORIZED,
      });
    }

    // Info: (20260105 - Tzuhan) 5. 簽發 DeWT
    const dewt = await signDeWT(user);

    return {
      dewt,
      user: {
        address: user.address,
        name: user.name,
        role: user.role,
      },
    };
  }

  public async verifySignature(
    address: string,
    authenticationData: AuthenticationJSON,
    expectedChallenge: string,
  ): Promise<boolean> {
    const user = await this.repo.findUserByAddress(address);

    if (!user || !user.pubKeyX || !user.pubKeyY) {
      throw new AppError({
        code: "NO000099",
        message: String("User not found or passkey not registered").slice(
          0,
          30,
        ),
        status: ApiCode.NOT_FOUND,
      });
    }

    const credentialPublicKey = reconstructKeyFromXY(
      user.pubKeyX,
      user.pubKeyY,
    );
    const credential: CredentialInfo = {
      id: authenticationData.id,
      publicKey: credentialPublicKey,
      algorithm: "ES256",
      transports: [],
    };

    try {
      await verifyAuthentication(
        authenticationData,
        credential,
        expectedChallenge,
      );
      return true;
    } catch (error) {
      console.error("Signature verification failed:", error);
      throw new AppError({
        code: "UN000099",
        message: "Invalid signature",
        status: ApiCode.UNAUTHORIZED,
      });
    }
  }
}

export const webAuthnService = new WebAuthnService(webAuthnRepo);
