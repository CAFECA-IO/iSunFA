import {
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  sign as cryptoSign,
} from "crypto";
import { encodeAbiParameters, parseAbiParameters, type Hex } from "viem";
import { extractXYFromSPKI } from "@/lib/auth/crypto_utils";

/**
 * Info: (20260809 - Luphia) 託管簽章器。
 *
 * fido2_account.sol 的 _validateSignature 走 FCL_WebAuthn.checkSignature，
 * 它要求簽章覆蓋 sha256(authenticatorData || sha256(clientDataJSON))，
 * 且 clientDataJSON 內 challenge 欄位必須等於 base64url(userOpHash)。
 * 因此託管使用者的伺服器端簽章必須「長得像一次 WebAuthn assertion」，
 * 而不是單純對 userOpHash 做 ECDSA —— 這個檔案負責合成那份 assertion。
 *
 * 合約只檢查 flags 的 User Presence (0x01)，不檢查 rpIdHash 與 origin，
 * 但我們仍照實填入本站的 rpId / origin，讓稽核紀錄與真實 passkey 一致。
 */

// Info: (20260809 - Luphia) authenticatorData flags：UP (0x01) | UV (0x04)
const AUTHENTICATOR_FLAGS = 0x05;

export interface ICustodialKeyPair {
  // Info: (20260809 - Luphia) PKCS#8 PEM，交給 key_vault 加密後才可落盤
  privateKeyPem: string;
  pubKeyX: string;
  pubKeyY: string;
}

export interface IWebAuthnAssertion {
  authenticatorData: Hex;
  clientDataJSON: Hex;
  challengeIndex: bigint;
  typeIndex: bigint;
  r: bigint;
  s: bigint;
}

function getOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function getRpId(): string {
  try {
    return new URL(getOrigin()).hostname;
  } catch {
    return "localhost";
  }
}

export function generateCustodialKeyPair(): ICustodialKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });

  const privateKeyPem = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();

  const spkiBase64 = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");

  const { x, y } = extractXYFromSPKI(spkiBase64);

  return {
    privateKeyPem,
    pubKeyX: x.toString(),
    pubKeyY: y.toString(),
  };
}

/**
 * Info: (20260809 - Luphia) 解析 DER 編碼的 ECDSA 簽章，取出 (r, s)。
 * Node 的 crypto.sign 對 EC 金鑰預設輸出 DER；合約需要的是兩個 uint256。
 */
function parseDerSignature(der: Buffer): { r: bigint; s: bigint } {
  let offset = 0;

  if (der[offset] !== 0x30) throw new Error("Invalid DER signature header");
  offset += 1;

  const seqLength = der[offset];
  offset += 1;
  // Info: (20260809 - Luphia) P-256 簽章長度必定 < 128，不會用到 long form；仍保留防呆
  if (seqLength & 0x80) {
    offset += seqLength & 0x7f;
  }

  const readInteger = (): bigint => {
    if (der[offset] !== 0x02) throw new Error("Invalid DER integer tag");
    offset += 1;
    const length = der[offset];
    offset += 1;
    const value = BigInt(
      `0x${der.subarray(offset, offset + length).toString("hex")}`,
    );
    offset += length;
    return value;
  };

  const r = readInteger();
  const s = readInteger();
  return { r, s };
}

function buildAuthenticatorData(): Buffer {
  const rpIdHash = createHash("sha256").update(getRpId()).digest();
  const flags = Buffer.from([AUTHENTICATOR_FLAGS]);
  // Info: (20260809 - Luphia) signCount 固定為 0：託管金鑰不在硬體內，計數器無防複製意義
  const signCount = Buffer.alloc(4);
  return Buffer.concat([rpIdHash, flags, signCount]);
}

/**
 * Info: (20260809 - Luphia) 以託管私鑰簽出一份合約可驗證的 WebAuthn assertion。
 * @param privateKeyPem 由 key_vault 解密取得的 PKCS#8 PEM
 * @param userOpHash EntryPoint.getUserOpHash 的結果（32 bytes），即 WebAuthn challenge
 */
export function signUserOpHash(
  privateKeyPem: string,
  userOpHash: Hex,
): IWebAuthnAssertion {
  const challengeBytes = Buffer.from(userOpHash.slice(2), "hex");
  if (challengeBytes.length !== 32) {
    throw new Error("userOpHash must be 32 bytes");
  }

  return signChallenge(privateKeyPem, challengeBytes.toString("base64url"));
}

/**
 * Info: (20260810 - Luphia) 對任意 base64url challenge 簽出 assertion。
 *
 * 系統裡所有 challenge 都是伺服器發的 32 bytes 值（UserOp 雜湊、訂單雜湊、
 * 登入 nonce），格式一致，因此同一段合成邏輯可以同時服務「鏈上簽章」與
 * 「授權證明」兩種用途——前端不需要為託管帳號改變任何後續處理。
 */
export function signChallenge(
  privateKeyPem: string,
  challenge: string,
): IWebAuthnAssertion {
  const clientData = {
    type: "webauthn.get",
    challenge,
    origin: getOrigin(),
    crossOrigin: false,
  };
  const clientDataString = JSON.stringify(clientData);
  const clientDataBuffer = Buffer.from(clientDataString, "utf8");

  /**
   * Info: (20260809 - Luphia) challengeIndex / typeIndex 指向「值的第一個字元」在 clientDataJSON 中的
   * byte 位移，與前端 crypto_utils.getWebAuthnSignatureStruct 的算法一致。
   * clientDataString 全為 ASCII（challenge 是 base64url、origin 是網址），故字元位移等同 byte 位移。
   */
  const challengeIndex = clientDataString.indexOf(challenge);
  const typeIndex = clientDataString.indexOf(clientData.type);
  if (challengeIndex < 0 || typeIndex < 0) {
    throw new Error("Failed to locate clientDataJSON fields");
  }

  const authenticatorData = buildAuthenticatorData();
  const clientDataHash = createHash("sha256").update(clientDataBuffer).digest();

  /**
   * Info: (20260809 - Luphia) crypto.sign 會先對輸入做一次 SHA-256，
   * 因此簽出來的正是 ECDSA over sha256(authenticatorData || sha256(clientDataJSON))，
   * 與 FCL_WebAuthn 的驗證式相同。
   */
  const derSignature = cryptoSign(
    "sha256",
    Buffer.concat([authenticatorData, clientDataHash]),
    createPrivateKey(privateKeyPem),
  );

  const { r, s } = parseDerSignature(derSignature);

  return {
    authenticatorData: `0x${authenticatorData.toString("hex")}` as Hex,
    clientDataJSON: `0x${clientDataBuffer.toString("hex")}` as Hex,
    challengeIndex: BigInt(challengeIndex),
    typeIndex: BigInt(typeIndex),
    r,
    s,
  };
}

/**
 * Info: (20260809 - Luphia) 編成 fido2_account.sol abi.decode 的順序：
 * (bytes authenticatorData, bytes clientDataJSON, uint256 challengeIndex, uint256 typeIndex, uint256 r, uint256 s)
 * 與前端 crypto_utils.encodeWebAuthnSignature 對齊。
 */
export function encodeAssertion(assertion: IWebAuthnAssertion): Hex {
  return encodeAbiParameters(
    parseAbiParameters("bytes, bytes, uint256, uint256, uint256, uint256"),
    [
      assertion.authenticatorData,
      assertion.clientDataJSON,
      assertion.challengeIndex,
      assertion.typeIndex,
      assertion.r,
      assertion.s,
    ],
  );
}
