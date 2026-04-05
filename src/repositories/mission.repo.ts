import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/client";

export class MissionRepository {
  async createMission(data: Prisma.MissionUncheckedCreateInput) {
    return prisma.mission.create({
      data,
    });
  }
}

export const missionRepo = new MissionRepository();
