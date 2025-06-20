import { Wallet, hexlify, encodeRlp, toBeHex } from 'ethers';

/**
 * Info: (20250618 - Tzuhan)
 * 對 ApplyHash 簽名，並將 signatureHex + hashcash + timestamp 做 RLP 封裝
 */
export function signApplyHash(
  hash: string,
  privateKey: string,
  hashcash: string,
  timestamp: number
): string {
  const wallet = new Wallet(privateKey);
  const signature = wallet.signingKey.sign(hash);
  const signatureHex =
    hexlify(signature.r) + hexlify(signature.s).slice(2) + signature.v.toString(16);

  return encodeRlp([signatureHex, hashcash, toBeHex(timestamp)]);
}
