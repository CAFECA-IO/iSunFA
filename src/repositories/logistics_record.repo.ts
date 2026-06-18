import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

export const logisticsRecordRepo = {
  findMany(args?: Prisma.LogisticsRecordFindManyArgs) {
    return prisma.logisticsRecord.findMany(args);
  },
  createMany(args: Prisma.LogisticsRecordCreateManyArgs) {
    return prisma.logisticsRecord.createMany(args);
  },
};
