import { prisma } from "@/lib/prisma";
import { Prisma, ReportDownloadTask } from "@/generated";

export const reportDownloadTaskRepo = {
  findMany<T extends Prisma.ReportDownloadTaskFindManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.ReportDownloadTaskFindManyArgs>,
  ): Promise<Prisma.ReportDownloadTaskGetPayload<T>[]> {
    return prisma.reportDownloadTask.findMany(args);
  },
  update(
    args: Prisma.ReportDownloadTaskUpdateArgs,
  ): Promise<ReportDownloadTask> {
    return prisma.reportDownloadTask.update(args);
  },
  createMany(
    args: Prisma.ReportDownloadTaskCreateManyArgs,
  ): Promise<Prisma.BatchPayload> {
    return prisma.reportDownloadTask.createMany(args);
  },
  count(args?: Prisma.ReportDownloadTaskCountArgs): Promise<number> {
    return prisma.reportDownloadTask.count(args);
  },
  deleteMany(
    args: Prisma.ReportDownloadTaskDeleteManyArgs,
  ): Promise<Prisma.BatchPayload> {
    return prisma.reportDownloadTask.deleteMany(args);
  },
  disconnect(): Promise<void> {
    return prisma.$disconnect();
  },
};
