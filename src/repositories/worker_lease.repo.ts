import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

/**
 * Info: (20261015 - Luphia) 背景 worker 租約的 Repository。
 *
 * 搶租約只靠條件更新：「沒有人持有、或持有者的租約已過期、或就是我自己」才寫得進去。
 * 兩個 worker 同時搶，資料庫只會讓其中一個的 UPDATE 命中（另一個 count = 0）。
 */
export class WorkerLeaseRepository {
  async tryAcquire(params: {
    name: string;
    holderId: string;
    now: Date;
    expiresAt: Date;
  }): Promise<boolean> {
    const { name, holderId, now, expiresAt } = params;
    const updated = await prisma.workerLease.updateMany({
      where: {
        name,
        OR: [{ holderId }, { expiresAt: { lt: now } }],
      },
      data: { holderId, expiresAt },
    });
    if (updated.count > 0) return true;

    // Info: (20261015 - Luphia) 第一次使用：還沒有這一列。撞到唯一鍵代表別人剛建好，視為沒搶到
    const existing = await prisma.workerLease.findUnique({ where: { name } });
    if (existing) return false;
    try {
      await prisma.workerLease.create({ data: { name, holderId, expiresAt } });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return false;
      }
      throw error;
    }
  }

  // Info: (20261015 - Luphia) 心跳：只有仍是持有者時才延長；回 false 代表租約已被接手
  async renew(params: {
    name: string;
    holderId: string;
    expiresAt: Date;
  }): Promise<boolean> {
    const updated = await prisma.workerLease.updateMany({
      where: { name: params.name, holderId: params.holderId },
      data: { expiresAt: params.expiresAt },
    });
    return updated.count > 0;
  }

  // Info: (20261015 - Luphia) 正常結束時立即放手，待命者不必等到 TTL
  async release(params: { name: string; holderId: string }): Promise<void> {
    await prisma.workerLease.updateMany({
      where: { name: params.name, holderId: params.holderId },
      data: { expiresAt: new Date(0) },
    });
  }
}

export const workerLeaseRepo = new WorkerLeaseRepository();
