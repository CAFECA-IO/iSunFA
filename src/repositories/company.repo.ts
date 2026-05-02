import { prisma } from "@/lib/prisma";
import { Prisma, Company } from "@/generated";

export const companyRepo = {
  findMany(args?: Prisma.CompanyFindManyArgs): Promise<Company[]> {
    return prisma.company.findMany(args);
  }
};
