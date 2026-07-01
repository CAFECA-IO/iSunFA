import { prisma } from "@/lib/prisma";
import { Prisma, Report } from "@/generated";

export const reportRepo = {
  findUnique(args: Prisma.ReportFindUniqueArgs): Promise<Report | null> {
    return prisma.report.findUnique(args);
  },
  findMany(args?: Prisma.ReportFindManyArgs): Promise<Report[]> {
    return prisma.report.findMany(args);
  },
  count(args?: Prisma.ReportCountArgs): Promise<number> {
    return prisma.report.count(args);
  },
  create(args: Prisma.ReportCreateArgs): Promise<Report> {
    return prisma.report.create(args);
  },
};
export type ReportRepo = typeof reportRepo;
