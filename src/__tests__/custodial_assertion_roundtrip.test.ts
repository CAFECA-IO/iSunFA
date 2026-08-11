import { describe, it, expect } from "@jest/globals";
import {
  generateCustodialKeyPair,
  signChallenge,
} from "@/lib/auth/custodial_signer";
import {
  getWebAuthnSignatureStruct,
  reconstructKeyFromXY,
} from "@/lib/auth/crypto_utils";
import { verifyAuthentication } from "@/lib/auth/fido2_server";

/**
 * Info: (20260810 - Luphia) 這組測試守的是託管簽章 API 的整條往返路徑。
 *
 * 設計的前提是：/api/v1/auth/custodial/sign 回傳的是一份**真正的 WebAuthn assertion**，
 * 因此前端與後端所有既有處理完全不需要為託管帳號分岔。這個前提只要有一個環節格式不符
 * （DER 編碼、base64url 與 base64、clientDataJSON 的欄位位移）整條就會靜默失敗，
 * 而症狀會表現成「簽章驗不過」這種很難定位的錯誤。
 *
 * 測試因此刻意複刻真實路徑：
 *   signChallenge → 組成 AuthenticationJSON（與 service 相同做法）
 *   → 前端的 getWebAuthnSignatureStruct 解析
 *   → 後端的 verifyAuthentication 驗證（webAuthnService.verifySignature 內部就是它）
 */

// Info: (20260810 - Luphia) 與 custodial_signing.service 的 derEncodeSignature 相同邏輯
function derEncodeSignature(r: bigint, s: bigint): string {
  const toDerInteger = (value: bigint): Buffer => {
    let hex = value.toString(16);
    if (hex.length % 2 !== 0) hex = `0${hex}`;
    let bytes = Buffer.from(hex, "hex");
    if (bytes[0] & 0x80) bytes = Buffer.concat([Buffer.from([0x00]), bytes]);
    return Buffer.concat([Buffer.from([0x02, bytes.length]), bytes]);
  };
  const body = Buffer.concat([toDerInteger(r), toDerInteger(s)]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body]).toString(
    "base64url",
  );
}

function buildAuthenticationJSON(
  credentialId: string,
  assertion: ReturnType<typeof signChallenge>,
) {
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
    },
  };
}

// Info: (20260810 - Luphia) 32 bytes 的 base64url，與系統內所有 challenge 同格式
const CHALLENGE = Buffer.alloc(32, 7).toString("base64url");

describe("custodial assertion round-trip", () => {
  it("後端 verifyAuthentication 接受託管簽出的 assertion", async () => {
    const keyPair = generateCustodialKeyPair();
    const assertion = signChallenge(keyPair.privateKeyPem, CHALLENGE);
    const authJson = buildAuthenticationJSON("custodial-test", assertion);

    const credential = {
      id: "custodial-test",
      publicKey: reconstructKeyFromXY(keyPair.pubKeyX, keyPair.pubKeyY),
      algorithm: "ES256" as const,
      transports: [],
    };

    await expect(
      verifyAuthentication(
        authJson as unknown as Parameters<typeof verifyAuthentication>[0],
        credential,
        CHALLENGE,
      ),
    ).resolves.toBeDefined();
  });

  it("challenge 不符時後端必須拒絕", async () => {
    const keyPair = generateCustodialKeyPair();
    const assertion = signChallenge(keyPair.privateKeyPem, CHALLENGE);
    const authJson = buildAuthenticationJSON("custodial-test", assertion);

    const credential = {
      id: "custodial-test",
      publicKey: reconstructKeyFromXY(keyPair.pubKeyX, keyPair.pubKeyY),
      algorithm: "ES256" as const,
      transports: [],
    };

    await expect(
      verifyAuthentication(
        authJson as unknown as Parameters<typeof verifyAuthentication>[0],
        credential,
        Buffer.alloc(32, 9).toString("base64url"),
      ),
    ).rejects.toThrow();
  });

  it("前端的 DER 解析取回的 (r, s) 與簽出時一致", () => {
    const keyPair = generateCustodialKeyPair();
    const assertion = signChallenge(keyPair.privateKeyPem, CHALLENGE);
    const authJson = buildAuthenticationJSON("custodial-test", assertion);

    /**
     * Info: (20260810 - Luphia) getWebAuthnSignatureStruct 是前端在付款流程
     * 把 assertion 編成合約簽章時走的那支函式。它自己解 DER，
     * 因此 DER 編碼若有誤（例如漏了 0x00 前綴）就會在這裡露出來。
     */
    const struct = getWebAuthnSignatureStruct(
      authJson as unknown as Parameters<typeof getWebAuthnSignatureStruct>[0],
      BigInt(keyPair.pubKeyX),
      BigInt(keyPair.pubKeyY),
    );

    expect(struct.r).toBe(assertion.r);
    expect(struct.s).toBe(assertion.s);
    expect(struct.challengeLocation).toBe(assertion.challengeIndex);
    expect(struct.responseTypeLocation).toBe(assertion.typeIndex);
  });

  it("最高位為 1 的 r/s 仍能正確 DER 往返（有號數前綴）", () => {
    /**
     * Info: (20260810 - Luphia) DER 的 INTEGER 是有號數，最高位為 1 時必須補 0x00。
     * 漏掉這個前綴的話大約每四次簽章就會壞一次——是典型的間歇性 bug，
     * 因此多簽幾把金鑰確保兩種情況都被涵蓋過。
     */
    let sawHighBit = false;

    for (let i = 0; i < 24; i += 1) {
      const keyPair = generateCustodialKeyPair();
      const assertion = signChallenge(keyPair.privateKeyPem, CHALLENGE);
      const authJson = buildAuthenticationJSON("custodial-test", assertion);

      const highBit = assertion.r >= 1n << 255n || assertion.s >= 1n << 255n;
      if (highBit) sawHighBit = true;

      const struct = getWebAuthnSignatureStruct(
        authJson as unknown as Parameters<typeof getWebAuthnSignatureStruct>[0],
        BigInt(keyPair.pubKeyX),
        BigInt(keyPair.pubKeyY),
      );
      expect(struct.r).toBe(assertion.r);
      expect(struct.s).toBe(assertion.s);
    }

    expect(sawHighBit).toBe(true);
  });
});
