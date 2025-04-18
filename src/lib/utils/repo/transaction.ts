import prisma from '@/client';
import { Prisma } from '@prisma/client';

/**
 * Info: (20250418 - Luphia)
 * 由於無法預期 repo response 格式，使用泛型 T
 * callback 能返回任意型別並依舊可以受編譯器檢驗
 */
export const transaction = <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: {
    isolationLevel?: Prisma.TransactionIsolationLevel;
    maxWait?: number;
    timeout?: number;
  }
): Promise<T> => {
  return prisma.$transaction(callback, options);
};
