import { keccak256 } from 'ethers';

/**
 * Info: (20250618 - Tzuhan)
 * 對 ApplyData（RLP encoded string）進行 Keccak256
 */
export function hashApplyData(encoded: string): string {
  return keccak256(encoded);
}
