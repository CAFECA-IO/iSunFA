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
  /**
   * Info: (20260702 - Julian) 根據篩選條件尋找報告
   * 採寬鬆檢索：若有指定公司，則抓取該公司所有報告；若無指定公司，則按類型與年份篩選。
   */
  async findByCriteria(
    companyNames: string[],
    reportTypes: string[],
    years: string[],
  ): Promise<Report[]> {
    const where: Prisma.ReportWhereInput = {};

    if (companyNames.length > 0) {
      // Info: (20260702 - Julian) 寬鬆模式：只要公司名稱匹配就全部抓出來，後續由 LLM 判斷年度/類型差異
      where.OR = companyNames.map((c) => ({ companyName: { contains: c } }));
    } else {
      // Info: (20260702 - Julian) 精準模式：在沒有公司名稱時，必須符合類型或年份
      if (reportTypes.length > 0) {
        where.OR = reportTypes.map((t) => ({ title: { contains: t } }));
      }
      if (years.length > 0) {
        const yearFilters = years.map((y) => ({ reportYear: y }));
        if (where.OR) {
          where.AND = [{ OR: yearFilters }];
        } else {
          where.OR = yearFilters;
        }
      }
    }

    return prisma.report.findMany({ where });
  },
};
export type ReportRepo = typeof reportRepo;
