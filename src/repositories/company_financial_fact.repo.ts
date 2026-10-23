import { prisma } from "@/lib/prisma";
import { CompanyFinancialFact, Prisma } from "@/generated";
import { FINANCIAL_FACT_WRITE_CHUNK } from "@/constants/company_observatory";
import { IFinancialFactInput } from "@/interfaces/company_observatory";

/**
 * Info: (20261023 - Luphia) 財務數字（`CompanyFinancialFact`）的唯一 DB 出入口。
 *
 * 寫入以「公司 × 期別 × 報表」為單位先刪後寫，包在同一個交易裡：同一期重跑會得到完全相同的列，
 * 來源更正（重編）時舊科目不會殘留。不同期別互不影響，歷史因此能逐日累積。
 */

function periodKey(fact: IFinancialFactInput): string {
  return `${fact.year}|${fact.quarter}|${fact.statement}`;
}

export const companyFinancialFactRepo = {
  async replacePeriods(facts: IFinancialFactInput[]): Promise<number> {
    if (facts.length === 0) return 0;
    const byPeriod = new Map<string, IFinancialFactInput[]>();
    for (const fact of facts) {
      const list = byPeriod.get(periodKey(fact)) ?? [];
      list.push(fact);
      byPeriod.set(periodKey(fact), list);
    }

    const operations: Prisma.PrismaPromise<Prisma.BatchPayload>[] = [];
    for (const group of byPeriod.values()) {
      const [{ year, quarter, statement }] = group;
      operations.push(
        prisma.companyFinancialFact.deleteMany({
          where: {
            year,
            quarter,
            statement,
            stockId: { in: Array.from(new Set(group.map((f) => f.stockId))) },
          },
        }),
      );
      for (let i = 0; i < group.length; i += FINANCIAL_FACT_WRITE_CHUNK) {
        operations.push(
          prisma.companyFinancialFact.createMany({
            data: group
              .slice(i, i + FINANCIAL_FACT_WRITE_CHUNK)
              .map((fact) => ({
                ...fact,
                value: new Prisma.Decimal(fact.value),
              })),
            // Info: (20261023 - Luphia) 同一列在來源裡重複出現時只留一筆，不讓整批失敗
            skipDuplicates: true,
          }),
        );
      }
    }
    await prisma.$transaction(operations);
    return facts.length;
  },

  findByStockId(stockId: string): Promise<CompanyFinancialFact[]> {
    return prisma.companyFinancialFact.findMany({
      where: { stockId },
      orderBy: [{ year: "desc" }, { quarter: "desc" }],
    });
  },
};
