import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";
import { Decimal } from "decimal.js";

export interface IAllocationRule {
  skuId: string;
  percentage: number | string | Decimal; // e.g. 0.3 for 30%
  basis?: string;
}

export class AllocationEngineService {
  /**
   * Info: (20260703 - Tzuhan)
   * 根據分攤規則，將大宗 ESG 紀錄 (如一張總電費單) 的碳排與活動數據，分攤給各個產品 (SKU)。
   * 此方法保證分攤比例總和不會超過 100% (1.0)，並處理 Decimal 精度防護。
   */
  public static async allocate(
    esgRecordId: string,
    rules: IAllocationRule[],
  ): Promise<void> {
    const esg = await prisma.esgRecord.findUnique({
      where: { id: esgRecordId },
    });

    if (!esg) {
      throw new Error(`EsgRecord ${esgRecordId} not found`);
    }

    // 1. 驗證比例總和不可超過 100%
    let totalPercentage = new Decimal(0);
    const validRules = rules.map((r) => {
      const p = new Decimal(r.percentage);
      if (p.isNegative()) {
        throw new Error("Allocation percentage cannot be negative");
      }
      totalPercentage = totalPercentage.plus(p);
      return { ...r, percentage: p };
    });

    if (totalPercentage.greaterThan(1)) {
      throw new Error("Total allocation percentage cannot exceed 100% (1.0)");
    }

    // 2. 清除舊有的分攤紀錄 (支援重新分攤)
    await prisma.esgAllocation.deleteMany({
      where: { esgRecordId },
    });

    // 3. 準備寫入新的分攤紀錄
    const originalAmount = new Decimal(esg.amount);
    const originalEmissions = new Decimal(esg.emissions);
    let originalBreakdown: Record<string, string | number> = {};
    if (esg.ghgBreakdown && typeof esg.ghgBreakdown === "object") {
      originalBreakdown = esg.ghgBreakdown as Record<string, string | number>;
    }

    for (const rule of validRules) {
      // 確保目標產品存在
      const sku = await prisma.digitalProductPassportSku.findUnique({
        where: { id: rule.skuId },
      });
      if (!sku) continue; // 或丟出 Error

      const allocatedAmount = originalAmount.mul(rule.percentage);
      const allocatedEmissions = originalEmissions.mul(rule.percentage);

      let allocatedBreakdown: Record<string, string> | null = null;
      if (Object.keys(originalBreakdown).length > 0) {
        allocatedBreakdown = {};
        for (const [gas, value] of Object.entries(originalBreakdown)) {
          const valDec = new Decimal(value);
          allocatedBreakdown[gas] = valDec.mul(rule.percentage).toString();
        }
      }

      await prisma.esgAllocation.create({
        data: {
          esgRecordId,
          skuId: rule.skuId,
          percentage: rule.percentage,
          basis: rule.basis,
          allocatedAmount,
          allocatedEmissions,
          allocatedGhgBreakdown: allocatedBreakdown || Prisma.JsonNull,
        },
      });
    }
  }
}
