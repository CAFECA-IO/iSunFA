import { keccak256 } from 'ethers';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { encodeApplyData } from '@/lib/utils/ethers/rlp';

/**
 * Info: (20250618 - Tzuhan)
 * 隨機生成 hashcash（固定長度 8）
 */
function generateHashcash(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Info: (20250618 - Tzuhan)
 * 不斷嘗試 hashcash，直到 keccak256(RLP(...)) 以 cfc 開頭
 */
export async function findValidHashcash(url: string): Promise<{
  hashcash: string;
  timestamp: number;
}> {
  const MAX_ATTEMPTS = 100000; // Info: (20250618 - Tzuhan)安全停止上限，防止死循環
  for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
    const hashcash = generateHashcash();
    const timestamp = Math.floor(Date.now() / 1000); // Info: (20250618 - Tzuhan) UNIX 秒數
    const encoded = encodeApplyData(url, hashcash, timestamp);
    const hash = keccak256(encoded);

    if (hash.slice(2, 5) === 'cfc') {
      return { hashcash, timestamp };
    }
  }

  throw new Error(STATUS_MESSAGE.FAILED_TO_FIND_HASH_CASH);
}
