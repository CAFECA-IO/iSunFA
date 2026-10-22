import { prisma } from "@/lib/prisma";
import { Prisma, Company } from "@/generated";

export const companyRepo = {
  findMany(args?: Prisma.CompanyFindManyArgs): Promise<Company[]> {
    return prisma.company.findMany(args);
  },
  upsert(args: Prisma.CompanyUpsertArgs): Promise<Company> {
    return prisma.company.upsert(args);
  },
  // Info: (20261022 - Luphia) 企業觀測站：公司搜尋分頁、公司頁、依產業瀏覽
  count(args?: Prisma.CompanyCountArgs): Promise<number> {
    return prisma.company.count(args);
  },
  findUnique(args: Prisma.CompanyFindUniqueArgs): Promise<Company | null> {
    return prisma.company.findUnique(args);
  },
  async countActiveByIndustry(): Promise<
    { industry: string | null; count: number }[]
  > {
    const groups = await prisma.company.groupBy({
      by: ["industry"],
      where: { isActive: true },
      _count: { _all: true },
    });
    return groups.map((group) => ({
      industry: group.industry,
      count: group._count._all,
    }));
  },
};
