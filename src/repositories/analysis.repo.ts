import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/client';

export class AnalysisRepository {
  async create(params: {
    reportId: string;
    userId: string;
    orderId: string;
    category: string;
    missionName: string;
    missionData: Prisma.InputJsonValue;
  }) {
    // Info: (20260128 - Luphia) Create Mission first to store data
    const mission = await prisma.mission.create({
      data: {
        userId: params.userId,
        name: params.missionName,
        data: params.missionData
      }
    });

    // Info: (20260128 - Luphia) Create Analysis linked to Mission
    return await prisma.analysis.create({
      data: {
        id: params.reportId,
        userId: params.userId,
        orderId: params.orderId,
        type: params.category,
        missionId: mission.id
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
}

export const analysisRepo = new AnalysisRepository();
