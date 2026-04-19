import { prisma } from "@/lib/prisma";
import { Prisma, Analysis, Mission } from "@/generated/client";
import { MISSION_STATUS } from "@/constants/status";

export type FullAnalysis = Prisma.AnalysisGetPayload<{
  include: {
    mission: true;
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
    missionName: string;
    status?: string;
    missionData: Prisma.InputJsonValue;
    tasks?: { type: string; order: number; data: Prisma.InputJsonValue }[];
  }): Promise<Analysis>;
  findByUserId(userId: string): Promise<Analysis[]>;
  findById(id: string): Promise<Analysis | null>;
  updateMissionUploadSuccess(
    missionId: string,
    planHash: string,
  ): Promise<Mission | null>;
  updateMissionUploadFailed(
    missionId: string,
    errorReason: string,
  ): Promise<Mission>;
  updateMissionPaymentSuccess(
    missionId: string,
  ): Promise<Mission | null>;
  getGlobalTopTags(limit?: number): Promise<string[]>;
  findAnalysisByKeywordAndType(
    userId: string,
    type: string,
    keyword: string,
  ): Promise<Analysis | null>;
  getFullAnalysisHistoryByUserId(userId: string): Promise<FullAnalysis[]>;
}

export class AnalysisRepository implements IAnalysisRepository {
  async create(params: {
    reportId: string;
    userId: string;
    orderId: string;
    category: string;
    missionName: string;
    status?: string;
    missionData: Prisma.InputJsonValue;
    tasks?: { type: string; order: number; data: Prisma.InputJsonValue }[];
  }) {
    // Info: (20260128 - Luphia) Create Mission first to store data
    const mission = await prisma.mission.create({
      data: {
        userId: params.userId,
        name: params.missionName,
        status: params.status || MISSION_STATUS.PENDING,
        data: params.missionData,
        tasks: params.tasks
          ? {
            create: params.tasks.map((t) => ({
              type: t.type,
              order: t.order,
              data: t.data,
            })),
          }
          : undefined,
      },
    });

    // Info: (20260128 - Luphia) Create Analysis linked to Mission
    // Info: (20260130 - Luphia) Analysis also needs data field, filling with missionData for now
    return await prisma.analysis.create({
      data: {
        id: params.reportId,
        userId: params.userId,
        orderId: params.orderId,
        type: params.category,
        missionId: mission.id,
        data: params.missionData, // Info: (20260130 - Luphia) Analysis data field is required
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
        mission: true,
        order: true,
      },
    });
  }
  async findById(id: string) {
    return prisma.analysis.findUnique({
      where: { id },
      include: {
        mission: true,
        order: true,
      },
    });
  }

  async updateMissionUploadSuccess(missionId: string, planHash: string) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });
    if (!mission) return null;

    // Info: (20260417 - Luphia) Keep PAYING status if we are waiting for tx receipt
    const nextStatus = mission.status === MISSION_STATUS.PAYING ? MISSION_STATUS.PAYING : MISSION_STATUS.PENDING;
    const mData = (mission.data as Record<string, unknown>) || {};
    return prisma.mission.update({
      where: { id: missionId },
      data: {
        status: nextStatus,
        data: { ...mData, planHash },
      },
    });
  }

  async updateMissionUploadFailed(missionId: string, errorReason: string) {
    return prisma.mission.update({
      where: { id: missionId },
      data: {
        status: MISSION_STATUS.FAILED,
        result: errorReason,
      },
    });
  }

  async updateMissionUnpaid(missionId: string, errorReason: string) {
    return prisma.mission.update({
      where: { id: missionId },
      data: {
        status: MISSION_STATUS.UNPAID,
        result: errorReason,
      },
    });
  }

  async updateMissionPaymentSuccess(missionId: string) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });
    if (!mission) return null;

    // Info: (20260417 - Luphia) Mark as PENDING immediately on payment success
    const nextStatus = MISSION_STATUS.PENDING;

    return prisma.mission.update({
      where: { id: missionId },
      data: { status: nextStatus },
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
  ): Promise<FullAnalysis[]> {
    return prisma.analysis.findMany({
      where: { userId, type: { not: "ai_consulting" } },
      orderBy: { createdAt: "desc" },
      include: {
        mission: true,
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
}

export const analysisRepo = new AnalysisRepository();
