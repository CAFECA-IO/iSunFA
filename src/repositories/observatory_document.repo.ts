import { prisma } from "@/lib/prisma";
import { ObservatoryDocument, Prisma } from "@/generated";
import {
  OBSERVATORY_DOCUMENT_STATUS,
  ObservatoryDocumentStatus,
  ObservatorySource,
} from "@/constants/company_observatory";
import { IObservatoryListQuery } from "@/interfaces/company_observatory";

/**
 * Info: (20261015 - Luphia) 企業觀測站文件狀態（`ObservatoryDocument`）的唯一 DB 出入口。
 *
 * 狀態變更一律帶「預期的舊狀態」做條件更新（`transition`）：下載與索引是兩支並行的迴圈，
 * 條件更新讓一份文件不可能被兩邊同時改寫；回傳 false 代表狀態已被別人改過，呼叫端放棄即可。
 */
export interface IObservatoryPlanRow {
  stockId: string;
  source: ObservatorySource;
  year: number;
}

export const observatoryDocumentRepo = {
  async createPending(rows: IObservatoryPlanRow[]): Promise<number> {
    if (rows.length === 0) return 0;
    const result = await prisma.observatoryDocument.createMany({
      data: rows.map((row) => ({
        ...row,
        status: OBSERVATORY_DOCUMENT_STATUS.PENDING,
      })),
      skipDuplicates: true,
    });
    return result.count;
  },

  // Info: (20261015 - Luphia) 待下載：新建、失敗待重試、查無待重查（後者限仍在追蹤視窗內的年度）
  findDueForDownload(params: {
    source: ObservatorySource;
    now: Date;
    minYear: number;
    take: number;
  }): Promise<ObservatoryDocument[]> {
    return prisma.observatoryDocument.findMany({
      where: {
        source: params.source,
        nextAttemptAt: { lte: params.now },
        OR: [
          {
            status: {
              in: [
                OBSERVATORY_DOCUMENT_STATUS.PENDING,
                OBSERVATORY_DOCUMENT_STATUS.FAILED,
              ],
            },
          },
          {
            status: OBSERVATORY_DOCUMENT_STATUS.NOT_AVAILABLE,
            year: { gte: params.minYear },
          },
        ],
      },
      orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
      take: params.take,
    });
  },

  findDueForIndex(params: {
    now: Date;
    take: number;
  }): Promise<ObservatoryDocument[]> {
    return prisma.observatoryDocument.findMany({
      where: {
        status: OBSERVATORY_DOCUMENT_STATUS.DOWNLOADED,
        nextAttemptAt: { lte: params.now },
      },
      orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
      take: params.take,
    });
  },

  async transition(
    id: string,
    fromStatus: string,
    data: Prisma.ObservatoryDocumentUpdateManyMutationInput,
  ): Promise<boolean> {
    const result = await prisma.observatoryDocument.updateMany({
      where: { id, status: fromStatus },
      data,
    });
    return result.count === 1;
  },

  // Info: (20261015 - Luphia) 會變動的來源（公司登記）：索引超過時效就排回下載，內容沒變不會重建索引
  async markStaleForRefresh(params: {
    source: ObservatorySource;
    indexedBefore: Date;
    now: Date;
  }): Promise<number> {
    const result = await prisma.observatoryDocument.updateMany({
      where: {
        source: params.source,
        status: OBSERVATORY_DOCUMENT_STATUS.INDEXED,
        indexedAt: { lt: params.indexedBefore },
      },
      data: {
        status: OBSERVATORY_DOCUMENT_STATUS.PENDING,
        nextAttemptAt: params.now,
      },
    });
    return result.count;
  },

  async countBySourceStatus(): Promise<
    { source: string; status: string; count: number }[]
  > {
    const groups = await prisma.observatoryDocument.groupBy({
      by: ["source", "status"],
      _count: { _all: true },
      orderBy: [{ source: "asc" }, { status: "asc" }],
    });
    return groups.map((group) => ({
      source: group.source,
      status: group.status,
      count: group._count._all,
    }));
  },

  async list(
    query: IObservatoryListQuery,
  ): Promise<{ rows: ObservatoryDocument[]; total: number }> {
    const where: Prisma.ObservatoryDocumentWhereInput = {
      stockId: query.stockId,
      source: query.source,
      status: query.status,
      year: query.year,
    };
    const [rows, total] = await Promise.all([
      prisma.observatoryDocument.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.observatoryDocument.count({ where }),
    ]);
    return { rows, total };
  },

  // Info: (20261015 - Luphia) 死信重新排入：只動 DEAD，重置次數；已成功或還在跑的不受影響
  async requeueDead(params: {
    ids?: string[];
    source?: ObservatorySource;
    now: Date;
  }): Promise<number> {
    const result = await prisma.observatoryDocument.updateMany({
      where: {
        status: OBSERVATORY_DOCUMENT_STATUS.DEAD,
        id: params.ids ? { in: params.ids } : undefined,
        source: params.source,
      },
      data: {
        status: OBSERVATORY_DOCUMENT_STATUS.PENDING,
        attemptCount: 0,
        nextAttemptAt: params.now,
      },
    });
    return result.count;
  },

  countByStatus(status: ObservatoryDocumentStatus): Promise<number> {
    return prisma.observatoryDocument.count({ where: { status } });
  },
};
