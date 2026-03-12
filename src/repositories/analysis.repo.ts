import { prisma } from '@/lib/prisma';
import { Prisma, Analysis, Mission } from '@/generated/client';
import { MISSION_STATUS } from '@/constants/status';

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
  updateMissionUploadSuccess(missionId: string, planHash: string): Promise<Mission | null>;
  updateMissionUploadFailed(missionId: string, errorReason: string): Promise<Mission>;
  getGlobalTopTags(limit?: number): Promise<string[]>;
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
        tasks: params.tasks ? {
          create: params.tasks.map(t => ({
            type: t.type,
            order: t.order,
            data: t.data
          }))
        } : undefined
      }
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
        data: params.missionData // Info: (20260130 - Luphia) Analysis data field is required
      }
    });
  }

  async findByUserId(userId: string) {
    return prisma.analysis.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        mission: true,
        order: true
      }
    });
  }
  async findById(id: string) {
    return prisma.analysis.findUnique({
      where: { id },
      include: {
        mission: true,
        order: true
      }
    });
  }

  async updateMissionUploadSuccess(missionId: string, planHash: string) {
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });
    if (!mission) return null;

    const mData = (mission.data as Record<string, unknown>) || {};
    return prisma.mission.update({
      where: { id: missionId },
      data: {
        status: MISSION_STATUS.PENDING,
        data: { ...mData, planHash }
      }
    });
  }

  async updateMissionUploadFailed(missionId: string, errorReason: string) {
    return prisma.mission.update({
      where: { id: missionId },
      data: {
        status: MISSION_STATUS.FAILED,
        result: errorReason
      }
    });
  }

  async getGlobalTopTags(limit: number = 20): Promise<string[]> {
    const topTags = await prisma.analysisTag.groupBy({
      by: ['tagId'],
      _count: {
        tagId: true,
      },
      orderBy: {
        _count: {
          tagId: 'desc',
        },
      },
      take: limit,
    });

    if (topTags.length === 0) return [];

    const tagIds = topTags.map(t => t.tagId);
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });

    // Info: (20260312 - Tzuhan) Create a map to ensure the returned tag strings are ordered by the count
    const tagMap = new Map(tags.map(t => [t.id, t.name]));
    return topTags.map(t => tagMap.get(t.tagId)).filter((name): name is string => !!name);
  }
}

export const analysisRepo = new AnalysisRepository();
