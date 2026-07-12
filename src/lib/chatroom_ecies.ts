// Info: (20260712 - Luphia) chatroom 非對稱加密（ECIES over secp256k1）+ HD 子金鑰派生 + passkey PRF 包裝主私鑰
// Info: (20260712 - Luphia) 任何人可用收件者公開的 xpub 加密；僅持有主私鑰（經 passkey PRF 解包）者能回推子私鑰解密
// Info: (20260712 - Luphia) 僅使用已安裝的 ethers 與瀏覽器原生 WebCrypto/WebAuthn，不新增相依

import {
  SigningKey,
  HDNodeWallet,
  randomBytes,
  hexlify,
  getBytes,
} from "ethers";
import {
  CHATROOM_ENCRYPTION_ALGORITHM,
  CHATROOM_ENCRYPTION_KEY_LENGTH,
  CHATROOM_ENCRYPTION_IV_BYTES,
  CHATROOM_HKDF_HASH,
  CHATROOM_ECIES_HKDF_INFO,
  CHATROOM_PRF_HKDF_INFO,
  CHATROOM_ECIES_ALGORITHM,
} from "@/constants/chatroom";

// Info: (20260712 - Luphia) 裝置/瀏覽器不支援 WebAuthn PRF 時拋出，由 UI 攔截並提示可用裝置
export class ChatroomUnsupportedDeviceError extends Error {
  constructor() {
    super("WEBAUTHN_PRF_UNSUPPORTED");
    this.name = "ChatroomUnsupportedDeviceError";
  }
}

export interface IEciesEnvelope {
  // Info: (20260712 - Luphia) base64(iv + 密文)
  encryptedContent: string;
  // Info: (20260712 - Luphia) ECIES 臨時公鑰（供收件者做 ECDH，同時作為 HKDF salt）
  ephemeralPublicKey: string;
  // Info: (20260712 - Luphia) HD 派生線索（相對路徑），供收件者回推對應子私鑰
  keyDerivationHint: string;
  algorithm: string;
}

export interface IChatroomMasterKey {
  // Info: (20260712 - Luphia) 主私鑰（xprv）：機密，包裝後才可入庫
  extendedPrivateKey: string;
  // Info: (20260712 - Luphia) 主公鑰（xpub）：對外公開，供他人加密
  extendedPublicKey: string;
}

// Info: (20260712 - Luphia) --- base64 / base64url 與位元組工具 ---
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return base64ToBytes(padded);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// Info: (20260712 - Luphia) --- HD 主金鑰與子金鑰派生（BIP32 / secp256k1，經 ethers）---
export function generateMasterKey(): IChatroomMasterKey {
  const root = HDNodeWallet.fromSeed(randomBytes(32));
  return {
    extendedPrivateKey: root.extendedKey,
    extendedPublicKey: root.neuter().extendedKey,
  };
}

function childSigningKey(extendedPrivateKey: string, hint: string): SigningKey {
  const node = HDNodeWallet.fromExtendedKey(extendedPrivateKey) as HDNodeWallet;
  return new SigningKey(node.derivePath(hint).privateKey);
}

function childPublicKey(extendedPublicKey: string, hint: string): string {
  const node = HDNodeWallet.fromExtendedKey(extendedPublicKey);
  return node.derivePath(hint).publicKey;
}

// Info: (20260712 - Luphia) --- WebCrypto HKDF → AES-256-GCM 金鑰 ---
async function deriveAesGcmKey(
  keyMaterial: Uint8Array,
  salt: Uint8Array,
  info: string,
): Promise<CryptoKey> {
  // Info: (20260712 - Luphia) 複製為 ArrayBuffer-backed，滿足 BufferSource（ethers getBytes 回傳的是 ArrayBufferLike）
  const ikm = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(keyMaterial),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: CHATROOM_HKDF_HASH,
      salt: new Uint8Array(salt),
      info: new TextEncoder().encode(info),
    },
    ikm,
    {
      name: CHATROOM_ENCRYPTION_ALGORITHM,
      length: CHATROOM_ENCRYPTION_KEY_LENGTH,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

// Info: (20260712 - Luphia) --- ECIES 加密：任何人用收件者 xpub 即可加密 ---
export async function eciesEncrypt(
  recipientExtendedPublicKey: string,
  plaintext: string,
): Promise<IEciesEnvelope> {
  // Info: (20260712 - Luphia) 隨機非強化索引作為派生線索
  const index = crypto.getRandomValues(new Uint32Array(1))[0] % 0x80000000;
  const hint = `0/${index}`;

  const recipientChildPublicKey = childPublicKey(
    recipientExtendedPublicKey,
    hint,
  );

  const ephemeral = new SigningKey(hexlify(randomBytes(32)));
  const sharedSecret = getBytes(
    ephemeral.computeSharedSecret(recipientChildPublicKey),
  );
  const salt = getBytes(ephemeral.publicKey);
  const aesKey = await deriveAesGcmKey(
    sharedSecret,
    salt,
    CHATROOM_ECIES_HKDF_INFO,
  );

  const iv = crypto.getRandomValues(
    new Uint8Array(CHATROOM_ENCRYPTION_IV_BYTES),
  );
  const cipher = await crypto.subtle.encrypt(
    { name: CHATROOM_ENCRYPTION_ALGORITHM, iv },
    aesKey,
    new TextEncoder().encode(plaintext),
  );

  return {
    encryptedContent: bytesToBase64(concatBytes(iv, new Uint8Array(cipher))),
    ephemeralPublicKey: ephemeral.publicKey,
    keyDerivationHint: hint,
    algorithm: CHATROOM_ECIES_ALGORITHM,
  };
}

// Info: (20260712 - Luphia) --- ECIES 解密：持主私鑰者依線索回推子私鑰 ---
export async function eciesDecrypt(
  masterExtendedPrivateKey: string,
  envelope: IEciesEnvelope,
): Promise<string> {
  const child = childSigningKey(
    masterExtendedPrivateKey,
    envelope.keyDerivationHint,
  );
  const sharedSecret = getBytes(
    child.computeSharedSecret(envelope.ephemeralPublicKey),
  );
  const salt = getBytes(envelope.ephemeralPublicKey);
  const aesKey = await deriveAesGcmKey(
    sharedSecret,
    salt,
    CHATROOM_ECIES_HKDF_INFO,
  );

  const combined = base64ToBytes(envelope.encryptedContent);
  const iv = combined.slice(0, CHATROOM_ENCRYPTION_IV_BYTES);
  const cipher = combined.slice(CHATROOM_ENCRYPTION_IV_BYTES);
  const plain = await crypto.subtle.decrypt(
    { name: CHATROOM_ENCRYPTION_ALGORITHM, iv },
    aesKey,
    cipher,
  );
  return new TextDecoder().decode(plain);
}

// Info: (20260712 - Luphia) --- 以 passkey PRF 秘密包裝 / 解包主私鑰 ---
async function derivePrfWrapKey(
  prfSecret: ArrayBuffer,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey("raw", prfSecret, "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: CHATROOM_HKDF_HASH,
      // Info: (20260712 - Luphia) 複製為 ArrayBuffer-backed，滿足 BufferSource
      salt: new Uint8Array(salt),
      info: new TextEncoder().encode(CHATROOM_PRF_HKDF_INFO),
    },
    ikm,
    {
      name: CHATROOM_ENCRYPTION_ALGORITHM,
      length: CHATROOM_ENCRYPTION_KEY_LENGTH,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function wrapMasterKey(
  prfSecret: ArrayBuffer,
  extendedPrivateKey: string,
): Promise<string> {
  const hkdfSalt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derivePrfWrapKey(prfSecret, hkdfSalt);
  const iv = crypto.getRandomValues(
    new Uint8Array(CHATROOM_ENCRYPTION_IV_BYTES),
  );
  const cipher = await crypto.subtle.encrypt(
    { name: CHATROOM_ENCRYPTION_ALGORITHM, iv },
    key,
    new TextEncoder().encode(extendedPrivateKey),
  );
  return bytesToBase64(concatBytes(hkdfSalt, iv, new Uint8Array(cipher)));
}

export async function unwrapMasterKey(
  prfSecret: ArrayBuffer,
  wrappedPrivateKey: string,
): Promise<string> {
  const all = base64ToBytes(wrappedPrivateKey);
  const hkdfSalt = all.slice(0, 16);
  const iv = all.slice(16, 16 + CHATROOM_ENCRYPTION_IV_BYTES);
  const cipher = all.slice(16 + CHATROOM_ENCRYPTION_IV_BYTES);
  const key = await derivePrfWrapKey(prfSecret, hkdfSalt);
  const plain = await crypto.subtle.decrypt(
    { name: CHATROOM_ENCRYPTION_ALGORITHM, iv },
    key,
    cipher,
  );
  return new TextDecoder().decode(plain);
}

// Info: (20260712 - Luphia) --- WebAuthn PRF：由 passkey 派生穩定秘密（不支援即拋錯）---
interface IPrfExtensionResults {
  prf?: { results?: { first?: ArrayBuffer } };
}

export function generatePrfSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function getPrfSecret(
  prfSalt: Uint8Array,
  credentialIdBase64Url?: string,
): Promise<ArrayBuffer> {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    userVerification: "required",
    // Info: (20260712 - Luphia) prf 尚未進入部分 TS DOM 型別，故以最小介面標註
    extensions: {
      prf: { eval: { first: prfSalt } },
    } as AuthenticationExtensionsClientInputs,
  };
  // Info: (20260712 - Luphia) 有 credentialId 就指定，否則交由平台以 discoverable credential（passkey）處理
  if (credentialIdBase64Url) {
    publicKey.allowCredentials = [
      { id: base64UrlToBytes(credentialIdBase64Url), type: "public-key" },
    ];
  }

  const assertion = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;

  if (!assertion) throw new ChatroomUnsupportedDeviceError();

  const results = (
    assertion.getClientExtensionResults() as IPrfExtensionResults
  ).prf?.results?.first;
  if (!results) throw new ChatroomUnsupportedDeviceError();
  return results;
}

// Info: (20260712 - Luphia) 匯出 base64 工具，供上層（DB 序列化等）共用單一實作
export { bytesToBase64, base64ToBytes };
