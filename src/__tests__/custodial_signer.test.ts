import { describe, it, expect } from "@jest/globals";
import { createHash, createPublicKey, verify as cryptoVerify } from "crypto";
import {
  generateCustodialKeyPair,
  signChallenge,
} from "@/lib/auth/custodial_signer";
import { reconstructKeyFromXY } from "@/lib/auth/crypto_utils";

/**
 * Info: (20260809 - Luphia) 這組測試守的是「託管簽章必須能通過 fido2_account.sol 的鏈上驗證」。
 * 因此驗證方式刻意複刻 FCL_WebAuthn.checkSignature 的三個條件：
 * 1. authenticatorData[32] 的 User Presence flag (0x01) 有設
 * 2. clientDataJSON 在 challengeIndex 起的字串等於 base64url(userOpHash)
 * 3. 簽章覆蓋 sha256(authenticatorData || sha256(clientDataJSON))
 *
 * Info: (20261015 - Luphia) 區塊鏈退役：不再簽 UserOp 雜湊，改直接驗 `signChallenge`。
 * 這三個條件同樣是後端 verifySignature 對託管 assertion 的要求，因此測試保留。
 */

// Info: (20261015 - Luphia) 以 32 bytes 的 base64url 表示伺服器發出的 challenge
function signUserOpHash(privateKeyPem: string, hash: `0x${string}`) {
  return signChallenge(
    privateKeyPem,
    Buffer.from(hash.slice(2), "hex").toString("base64url"),
  );
}

const USER_OP_HASH =
  "0x1f2e3d4c5b6a798877665544332211ffeeddccbbaa99887766554433221100ff" as const;

function toPublicKey(pubKeyX: string, pubKeyY: string) {
  const spkiBase64Url = reconstructKeyFromXY(pubKeyX, pubKeyY);
  return createPublicKey({
    key: Buffer.from(spkiBase64Url, "base64url"),
    format: "der",
    type: "spki",
  });
}

function toFixed32(value: bigint): Buffer {
  return Buffer.from(value.toString(16).padStart(64, "0"), "hex");
}

describe("custodial signer", () => {
  it("產生的公鑰座標可還原成合法的 P-256 公鑰", () => {
    const keyPair = generateCustodialKeyPair();

    expect(keyPair.privateKeyPem).toContain("BEGIN PRIVATE KEY");
    expect(() => toPublicKey(keyPair.pubKeyX, keyPair.pubKeyY)).not.toThrow();
  });

  it("簽出的 assertion 符合 FCL_WebAuthn 的驗證條件", () => {
    const keyPair = generateCustodialKeyPair();
    const assertion = signUserOpHash(keyPair.privateKeyPem, USER_OP_HASH);

    const authenticatorData = Buffer.from(
      assertion.authenticatorData.slice(2),
      "hex",
    );
    const clientDataJSON = Buffer.from(
      assertion.clientDataJSON.slice(2),
      "hex",
    );

    // Info: (20260809 - Luphia) 條件 1：User Presence flag
    expect(authenticatorData.length).toBe(37);
    expect(authenticatorData[32] & 0x01).toBe(0x01);

    // Info: (20260809 - Luphia) 條件 2：challenge 位移正確且內容等於 base64url(userOpHash)
    const expectedChallenge = Buffer.from(
      USER_OP_HASH.slice(2),
      "hex",
    ).toString("base64url");
    const extracted = clientDataJSON
      .subarray(
        Number(assertion.challengeIndex),
        Number(assertion.challengeIndex) + expectedChallenge.length,
      )
      .toString("utf8");
    expect(extracted).toBe(expectedChallenge);

    // Info: (20260809 - Luphia) typeIndex 應指向 "webauthn.get"
    const type = clientDataJSON
      .subarray(
        Number(assertion.typeIndex),
        Number(assertion.typeIndex) + "webauthn.get".length,
      )
      .toString("utf8");
    expect(type).toBe("webauthn.get");

    // Info: (20260809 - Luphia) 條件 3：簽章覆蓋 sha256(authData || sha256(clientData))
    const message = Buffer.concat([
      authenticatorData,
      createHash("sha256").update(clientDataJSON).digest(),
    ]);
    const rawSignature = Buffer.concat([
      toFixed32(assertion.r),
      toFixed32(assertion.s),
    ]);

    const isValid = cryptoVerify(
      "sha256",
      message,
      {
        key: toPublicKey(keyPair.pubKeyX, keyPair.pubKeyY),
        dsaEncoding: "ieee-p1363",
      },
      rawSignature,
    );
    expect(isValid).toBe(true);
  });

  it("不同 userOpHash 的簽章不可互換", () => {
    const keyPair = generateCustodialKeyPair();
    const assertion = signUserOpHash(keyPair.privateKeyPem, USER_OP_HASH);

    const otherHash =
      "0x00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff" as const;
    const otherAssertion = signUserOpHash(keyPair.privateKeyPem, otherHash);

    expect(otherAssertion.clientDataJSON).not.toBe(assertion.clientDataJSON);

    const message = Buffer.concat([
      Buffer.from(assertion.authenticatorData.slice(2), "hex"),
      createHash("sha256")
        .update(Buffer.from(assertion.clientDataJSON.slice(2), "hex"))
        .digest(),
    ]);
    const crossSignature = Buffer.concat([
      toFixed32(otherAssertion.r),
      toFixed32(otherAssertion.s),
    ]);

    expect(
      cryptoVerify(
        "sha256",
        message,
        {
          key: toPublicKey(keyPair.pubKeyX, keyPair.pubKeyY),
          dsaEncoding: "ieee-p1363",
        },
        crossSignature,
      ),
    ).toBe(false);
  });
});
