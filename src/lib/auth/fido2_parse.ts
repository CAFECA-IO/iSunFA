import { decode } from 'cbor-js';
import { importJWK, exportJWK } from 'jose';
import { Buffer } from 'buffer';

// Info: (20251112 - Tzuhan) 建立介面，符合 IPascalCase 規範
export interface ICoordinates {
  x: string;
  y: string;
}

interface IAttestationObject {
  authData: Uint8Array;
  fmt: string;
  attStmt: unknown;
}
type ICosePublicKey = Record<number, number | ArrayBuffer | Uint8Array>;

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    if (padding === 2) {
      base64 += '==';
    } else if (padding === 3) {
      base64 += '=';
    }
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Info: (20251112 - Tzuhan)
 * 將 ArrayBuffer 或 Uint8Array 轉換為 Base64URL 字串
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;

  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Info: (20251112 - Tzuhan)
 * [PoC 1.2 核心實作]
 * 解析 Attestation Object 並提取 P-256 x, y 座標。
 */
export function parsePublicKeyCoordinates(attestationObjectBase64: string): ICoordinates | null {
  try {
    const attestationObject = base64UrlToArrayBuffer(attestationObjectBase64);
    const attestation = decode(attestationObject) as IAttestationObject;

    const authData = attestation.authData;
    const dataView = new DataView(authData.buffer, authData.byteOffset, authData.byteLength);

    const flags = dataView.getUint8(32);
    const attestedCredentialDataPresent = (flags & (1 << 6)) !== 0;

    if (!attestedCredentialDataPresent) {
      return null;
    }

    let offset = 37;
    offset += 16;
    const credentialIdLength = dataView.getUint16(offset);
    offset += 2;
    offset += credentialIdLength;

    const cosePublicKeyBuffer = authData.slice(offset);

    const cosePublicKey = decode(cosePublicKeyBuffer.buffer) as ICosePublicKey;

    const alg = cosePublicKey[3] as number;
    const crv = cosePublicKey[-1] as number;

    if (alg !== -7 || crv !== 1) {
      return null;
    }

    const xRaw = cosePublicKey[-2] as ArrayBuffer | Uint8Array;
    const yRaw = cosePublicKey[-3] as ArrayBuffer | Uint8Array;

    if (!xRaw || !yRaw) {
      return null;
    }

    return {
      x: bufferToBase64Url(xRaw),
      y: bufferToBase64Url(yRaw),
    };
  } catch (error) {
    console.error('[DEBUG] Failed to parse attestationObject:', error);
    return null;
  }
}

/**
 * Info: (20251204 - Tzuhan) [Fix] 將 Base64URL 座標轉換為 JWK JSON 字串
 * 用途：註冊時，將座標轉為標準字串格式存入 DB
 */
export async function convertCoordsToKey(x: string, y: string): Promise<string> {
  const jwkInput = {
    kty: 'EC',
    crv: 'P-256',
    x: x,
    y: y,
    ext: true,
  };

  const keyLike = await importJWK(jwkInput, 'ES256');
  const jwkOutput = await exportJWK(keyLike);

  return JSON.stringify(jwkOutput);
}

export function extractXYFromSPKI(spkiBase64: string) {
  // Info: (20251205 - Tzuhan) 1. 處理 Base64URL 格式 (將 - 轉為 +, _ 轉為 /): WebAuthn 輸出的通常是 Base64URL，但 Node.js 的 Buffer 容錯率高，為了保險起見，我們標準化它。
  const base64 = spkiBase64.replace(/-/g, '+').replace(/_/g, '/');

  // Info: (20251205 - Tzuhan) 2. 解碼為 Buffer
  const buffer = Buffer.from(base64, 'base64');

  /**
   * Info: (20251205 - Tzuhan) 3. 定位公鑰位置
   * P-256 的 SPKI Header 固定為 26 bytes。
   * 第 27 byte (index 26) 通常是 0x04 (代表未壓縮的座標點 format)
   * 檢查標頭長度與格式標記 (0x04)
   * 直接找最後的 65 bytes (1 byte prefix + 32 byte X + 32 byte Y)
   */
  const keyLength = 65;
  const start = buffer.length - keyLength;

  if (buffer[start] !== 0x04) {
    throw new Error('Public key is not in uncompressed format (0x04)');
  }

  // Info: (20251205 - Tzuhan) 4. 切割 X 和 Y，跳過 0x04，取接下來的 32 bytes 為 X，再接下來 32 bytes 為 Y
  const xBuffer = buffer.subarray(start + 1, start + 1 + 32);
  const yBuffer = buffer.subarray(start + 1 + 32, start + 1 + 32 + 32);

  return {
    x: BigInt('0x' + xBuffer.toString('hex')),
    y: BigInt('0x' + yBuffer.toString('hex')),
  };
}
