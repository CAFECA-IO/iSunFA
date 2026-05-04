import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

export const shareRepo = {
  findTokenUnique<T extends Prisma.ReportShareTokenFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.ReportShareTokenFindUniqueArgs>,
  ) {
    return prisma.reportShareToken.findUnique(args);
  },
  findTokenFirst<T extends Prisma.ReportShareTokenFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.ReportShareTokenFindFirstArgs>,
  ) {
    return prisma.reportShareToken.findFirst(args);
  },
  createToken<T extends Prisma.ReportShareTokenCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ReportShareTokenCreateArgs>,
  ) {
    return prisma.reportShareToken.create(args);
  },
  updateToken<T extends Prisma.ReportShareTokenUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ReportShareTokenUpdateArgs>,
  ) {
    return prisma.reportShareToken.update(args);
  },
};
