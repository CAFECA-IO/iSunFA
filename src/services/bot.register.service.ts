import { p256 } from "@noble/curves/p256";
import { sha256 } from "@noble/hashes/sha256";
import crypto from "crypto";
import { webAuthnService } from "@/services/webauthn.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";

export class RegisterBotService {
  /**
   * Info: (20260429 - Luphia)
   * 根據輸入的 seed 生成 P-256 私鑰，建立帳號並且取得 DeWT 登入。
   * 適用於 AI Agent 等需要自動完成 FIDO2 註冊與登入的無頭客戶端場景。
   *
   * Info: (20261015 - Luphia) 區塊鏈退役：不再預測 SCW 位址、送 bundler 部署、輪詢鏈上確認。
   * 帳號改走與 passkey 註冊同一支 `createAccountForKey`（位址鏈下推導、寫入 DB）。
   * 機器人產生不出真實的 attestation，所以跳過 verifyRegistration 直接呼叫 service；
   * 它是否真的持有私鑰，由下一步的登入驗章證明。同一個 seed 重跑時帳號已存在，直接登入。
   */
  public async registerAndLogin(
    seed: string,
    username: string,
  ): Promise<{
    dewt: string;
    address: string;
    privKeyHex: string;
    credentialID: string;
  }> {
    // Info: (20260429 - Luphia) 1. 從 seed 推導出 P-256 私鑰與 Credential ID
    const privKeyBytes = sha256(new TextEncoder().encode(seed));
    const pubKeyBytes = p256.getPublicKey(privKeyBytes, false); // Info: (20260429 - Luphia) false for uncompressed point (0x04)

    // Info: (20260429 - Luphia) 取出 X 和 Y 座標
    const xHex = Buffer.from(pubKeyBytes.slice(1, 33)).toString("hex");
    const yHex = Buffer.from(pubKeyBytes.slice(33, 65)).toString("hex");
    const pubKeyX = BigInt("0x" + xHex);
    const pubKeyY = BigInt("0x" + yHex);

    // Info: (20260429 - Luphia) 生成決定性的 credentialID (必須符合 Base64URL 格式以相容 WebAuthn)
    const rawIdBytes = crypto.createHash("sha256").update(seed).digest();
    const credentialID = Buffer.from(rawIdBytes).toString("base64url");

    // Info: (20261015 - Luphia) 2. 建立帳號（DB）；重跑同一個 seed 時帳號已存在，視為成功
    try {
      const created = await webAuthnService.createAccountForKey({
        credentialId: credentialID,
        pubKeyX: pubKeyX.toString(),
        pubKeyY: pubKeyY.toString(),
        name: username,
      });
      console.log(
        `[BotService] Account created for '${username}' at ${created.address}`,
      );
    } catch (error) {
      const alreadyRegistered =
        error instanceof AppError &&
        error.apiCode === API_ERRORS.AUTH_PASSKEY_ALREADY_REGISTERED.code;
      if (!alreadyRegistered) throw error;
      console.log(`[BotService] Account for '${username}' already exists.`);
    }

    // Info: (20260429 - Luphia) 3. 登入取得 DeWT
    console.log(`[BotService] Logging in...`);
    const challengeTokenAndData =
      await webAuthnService.generateStatelessLoginOptions();
    const loginChallenge = challengeTokenAndData.challenge; // Info: (20260429 - Luphia) verifyLogin expects token, but we need challenge to sign

    const loginAuthJson = this.createMockAuthenticationJSON(
      loginChallenge,
      credentialID,
      privKeyBytes,
    );
    const loginResult = await webAuthnService.loginWithCredential(
      challengeTokenAndData.token,
      loginAuthJson,
    );

    console.log(`[BotService] Login successful!`);

    return {
      dewt: loginResult.dewt,
      address: loginResult.user.address,
      privKeyHex: Buffer.from(privKeyBytes).toString("hex"),
      credentialID,
    };
  }

  /**
   * Info: (20260429 - Luphia)
   * 在後端利用 P-256 私鑰模擬 FIDO2 裝置的簽章過程，
   * 產出符合 WebAuthn 標準的 AuthenticationJSON 結構。
   */
  public createMockAuthenticationJSON(
    challengeBase64: string,
    credentialID: string,
    privKeyBytes: Uint8Array,
  ): AuthenticationJSON {
    // Info: (20260429 - Luphia) 1. 偽造 clientDataJSON
    const clientData = {
      type: "webauthn.get",
      challenge: challengeBase64,
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      crossOrigin: false,
    };
    const clientDataJSONStr = JSON.stringify(clientData);
    const clientDataJSONBase64 =
      Buffer.from(clientDataJSONStr).toString("base64url");

    // Info: (20260429 - Luphia) 2. 偽造 authenticatorData (37 bytes: 32 bytes rpIdHash + 1 byte flags + 4 bytes signCount)
    const originUrl = new URL(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    );
    const rpIdHash = crypto
      .createHash("sha256")
      .update(originUrl.hostname)
      .digest();
    const flags = Buffer.from([0x01]); // Info: (20260429 - Luphia) User Present (UP) bit set
    const signCount = Buffer.from([0x00, 0x00, 0x00, 0x00]); // Info: (20260429 - Luphia) 簽章計數
    const authenticatorDataBuf = Buffer.concat([rpIdHash, flags, signCount]);
    const authenticatorDataBase64 = authenticatorDataBuf.toString("base64url");

    // Info: (20260429 - Luphia) 3. 準備待簽名訊息 Hash: SHA256(authenticatorData || SHA256(clientDataJSON))
    const clientDataHash = crypto
      .createHash("sha256")
      .update(clientDataJSONStr)
      .digest();
    const messageBuf = Buffer.concat([authenticatorDataBuf, clientDataHash]);
    const messageHash = crypto.createHash("sha256").update(messageBuf).digest();

    // Info: (20260429 - Luphia) 4. 進行 P-256 簽名
    const signatureObj = p256.sign(messageHash, privKeyBytes);
    const signatureDerHex = signatureObj.toDERRawBytes();
    const signatureBase64 = Buffer.from(signatureDerHex).toString("base64url");

    // Info: (20260429 - Luphia) 5. 回傳符合 WebAuthn 規格的物件
    return {
      id: credentialID,
      rawId: credentialID,
      type: "public-key",
      clientExtensionResults: {},
      response: {
        authenticatorData: authenticatorDataBase64,
        clientDataJSON: clientDataJSONBase64,
        signature: signatureBase64,
        userHandle: undefined,
      },
    };
  }
}

export const registerBotService = new RegisterBotService();
