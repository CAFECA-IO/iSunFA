import { encodeRlp, decodeRlp, toNumber, toUtf8String, toUtf8Bytes, toBeHex } from 'ethers';

export function encodeApplyData(url: string, hashcash: string, timestamp: number): string {
  return encodeRlp([toUtf8Bytes(url), toUtf8Bytes(hashcash), toBeHex(timestamp)]);
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
