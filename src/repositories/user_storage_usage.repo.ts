// Info: (20260716 - Emily) 每使用者附件儲存用量 Repository(#6517):唯一可觸 UserStorageUsage 表的層級
// Info: (20260716 - Emily) usedBytes 為 BigInt(numerical_precision_guideline:累計位元組不走原生 number 運算)

import { prisma } from "@/lib/prisma";

export const userStorageUsageRepo = {
  // Info: (20260716 - Emily) 讀取目前用量;無記錄視為 0
  async getUsedBytes(address: string): Promise<bigint> {
    const record = await prisma.userStorageUsage.findUnique({
      where: { address },
      select: { usedBytes: true },
    });
    return record?.usedBytes ?? BigInt(0);
  },

  // Info: (20260716 - Emily) 原子累加(upsert + increment):並發上傳不遺失計數
  async addUsedBytes(address: string, deltaBytes: bigint): Promise<void> {
    await prisma.userStorageUsage.upsert({
      where: { address },
      create: { address, usedBytes: deltaBytes },
      update: { usedBytes: { increment: deltaBytes } },
    });
  },
};
