import { prisma } from "@/lib/prisma";
import { Prisma, Analysis } from "@/generated";
import { CATEGORIES } from "@/constants/analysis";

export type FullAnalysis = Prisma.AnalysisGetPayload<{
  include: {
    order: true;
    tags: {
      include: { tag: true };
    };
    reportShareTokens: true;
  };
}>;

export interface IAnalysisRepository {
  create(params: {
    reportId: string;
    userId: string;
    orderId: string;
    category: string;
    data: Prisma.InputJsonValue;
  }): Promise<Analysis>;
  findByUserId(userId: string): Promise<Analysis[]>;
  findById(id: string): Promise<Analysis | null>;

  getGlobalTopTags(limit?: number): Promise<string[]>;
  findAnalysisByKeywordAndType(
    userId: string,
    type: string,
    keyword: string,
  ): Promise<Analysis | null>;
  getFullAnalysisHistoryByUserId(
    userId: string,
    category?: string,
  ): Promise<FullAnalysis[]>;
  syncAnalysisTags(analysisId: string, tags: string[]): Promise<void>;
}

export class AnalysisRepository implements IAnalysisRepository {
  async findFirst(args: Prisma.AnalysisFindFirstArgs) {
    return prisma.analysis.findFirst(args);
  }

  async findMany(args: Prisma.AnalysisFindManyArgs) {
    return prisma.analysis.findMany(args);
  }

  async update(args: Prisma.AnalysisUpdateArgs) {
    return prisma.analysis.update(args);
  }

  async create(params: {
    reportId: string;
    userId: string;
    orderId: string;
    category: string;
    data: Prisma.InputJsonValue;
  }) {
    // Info: (20260420 - Luphia) Create Analysis linked strictly to Order, no more Mission table.
    return await prisma.analysis.create({
      data: {
        id: params.reportId,
        userId: params.userId,
        orderId: params.orderId,
        type: params.category,
        data: params.data,
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.analysis.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        order: true,
      },
    });
  }
  async findById(id: string) {
    return prisma.analysis.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });
  }

  async getGlobalTopTags(limit: number = 20): Promise<string[]> {
    const topTags = await prisma.analysisTag.groupBy({
      by: ["tagId"],
      _count: {
        tagId: true,
      },
      orderBy: {
        _count: {
          tagId: "desc",
        },
      },
      take: limit,
    });

    if (topTags.length === 0) return [];

    const tagIds = topTags.map((t) => t.tagId);
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });

    // Info: (20260312 - Tzuhan) Create a map to ensure the returned tag strings are ordered by the count
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));
    return topTags
      .map((t) => tagMap.get(t.tagId))
      .filter((name): name is string => !!name);
  }

  async findAnalysisByKeywordAndType(
    userId: string,
    type: string,
    keyword: string,
  ): Promise<Analysis | null> {
    return prisma.analysis.findFirst({
      where: {
        userId,
        type,
        data: {
          path: ["keyword"],
          equals: keyword,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getFullAnalysisHistoryByUserId(
    userId: string,
    category?: string,
  ): Promise<FullAnalysis[]> {
    const whereClause: Prisma.AnalysisWhereInput = { userId };

    if (category) {
      whereClause.type = category;
    } else {
      whereClause.type = {
        in: [...CATEGORIES],
      };
    }

    return prisma.analysis.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        order: true,
        tags: {
          include: { tag: true },
        },
        reportShareTokens: {
          where: { isActive: true },
          take: 1,
        },
      },
    });
  }

  async syncAnalysisTags(analysisId: string, tags: string[]): Promise<void> {
    for (const rawTag of tags) {
      const tagStr = String(rawTag).trim();
      if (!tagStr) continue;

      // Info: (20260420 - Luphia) Upsert tag
      const tagRecord = await prisma.tag.upsert({
        where: { name: tagStr },
        update: {},
        create: { name: tagStr },
      });

      // Info: (20260420 - Luphia) Upsert AnalysisTag
      await prisma.analysisTag.upsert({
        where: {
          analysisId_tagId: {
            analysisId: analysisId,
            tagId: tagRecord.id,
          },
        },
        update: {},
        create: {
          analysisId: analysisId,
          tagId: tagRecord.id,
        },
      });
    }
  }
}

export const analysisRepo = new AnalysisRepository();
