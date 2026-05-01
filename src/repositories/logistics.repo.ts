import { prisma } from "@/lib/prisma";
import { Prisma, Seaport, Airport, LogisticsCache } from "@/generated/client";

export interface ILogisticsRepository {
  getSeaports(sizes: string[]): Promise<Seaport[]>;
  getAirports(sizes: string[]): Promise<Airport[]>;
  getCachedPlan(originLat: number, originLng: number, destLat: number, destLng: number, weightKg: number): Promise<LogisticsCache | null>;
  saveCachedPlan(data: Prisma.LogisticsCacheCreateInput | Prisma.LogisticsCacheUncheckedCreateInput): Promise<LogisticsCache>;
}

export class LogisticsRepository implements ILogisticsRepository {
  async getSeaports(sizes: string[]) {
    return prisma.seaport.findMany({
      where: { size: { in: sizes } }
    });
  }

  async getAirports(sizes: string[]) {
    return prisma.airport.findMany({
      where: { size: { in: sizes } }
    });
  }

  async getCachedPlan(originLat: number, originLng: number, destLat: number, destLng: number, weightKg: number) {
    return prisma.logisticsCache.findFirst({
      where: {
        originLat,
        originLng,
        destLat,
        destLng,
        weightKg
      }
    });
  }

  async saveCachedPlan(data: Prisma.LogisticsCacheCreateInput | Prisma.LogisticsCacheUncheckedCreateInput) {
    return prisma.logisticsCache.create({
      data
    });
  }
}

export const logisticsRepo = new LogisticsRepository();
