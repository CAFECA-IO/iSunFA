import { encodeRlp, decodeRlp, hexlify, toNumber, toUtf8String, toBeArray } from 'ethers';

export function encodeApplyData(url: string, hashcash: string, timestamp: number): string {
  return encodeRlp([
    url,
    hashcash,
    hexlify(toBeArray(timestamp)), // Info: (20250618 - Tzuhan) timestamp 必須轉為 hex 字串
  ]);
}

export function decodeApplyData(encoded: string): {
  url: string;
  hashcash: string;
  timestamp: number;
} {
  const decoded = decodeRlp(encoded);

  if (!Array.isArray(decoded) || decoded.length !== 3) {
    throw new Error('Invalid RLP structure: expected [url, hashcash, timestamp]');
  }

  return {
    url: toUtf8String(decoded[0] as unknown as Uint8Array),
    hashcash: toUtf8String(decoded[1] as unknown as Uint8Array),
    timestamp: toNumber(decoded[2] as unknown as Uint8Array),
  };
}
