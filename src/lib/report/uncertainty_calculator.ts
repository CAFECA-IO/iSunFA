import { Prisma } from "@/generated";
import { PRIMARY_DATA_DISCOUNT } from "@/constants/esg";

export class UncertaintyCalculator {
  // Info: (20260707 - Tzuhan) 統一四捨五入到小數點後 6 位，兼顧高精度與防溢出
  private static readonly PRECISION = 6;

  /**
   * 計算單一筆活動數據折扣後的最終不確定性 (U_AD)
   * @param baseUncertainty 從 DQI 映射得到的基礎不確定性 (e.g. 0.05 for 5%)
   * @param dqiType 數據類型 (PRIMARY / SECONDARY)
   * @returns 處理過折扣的 Decimal
   */
  public static adjustUncertaintyByType(
    baseUncertainty: Prisma.Decimal,
    dqiType: string,
  ): Prisma.Decimal {
    if (dqiType === "PRIMARY") {
      return baseUncertainty.mul(PRIMARY_DATA_DISCOUNT);
    }
    return baseUncertainty;
  }

  /**
   * 計算單筆紀錄的總不確定性： U_record = sqrt(U_AD^2 + U_EF^2)
   * @param uAd 活動數據不確定性 (Decimal)
   * @param uEf 排放係數不確定性 (Decimal)
   * @returns 單筆不確定性百分比 (Decimal)
   */
  public static calculateRecordUncertainty(
    uAd: Prisma.Decimal,
    uEf: Prisma.Decimal,
  ): Prisma.Decimal {
    const uAdSq = uAd.pow(2);
    const uEfSq = uEf.pow(2);
    // Info: (20260707 - Tzuhan) Prisma.Decimal 支援 sqrt
    const sumSq = uAdSq.add(uEfSq);
    return sumSq
      .sqrt()
      .toDecimalPlaces(this.PRECISION, Prisma.Decimal.ROUND_HALF_UP);
  }

  /**
   * 計算多筆紀錄加總後的總不確定性 (Error Propagation)
   * 公式: U_total = sqrt( sum( (E_i * U_i)^2 ) ) / sum( E_i )
   * @param items 包含排放量與不確定性的陣列
   * @returns 總不確定性百分比 (Decimal)
   */
  public static calculateAggregatedUncertainty(
    items: { emissions: Prisma.Decimal; uncertainty: Prisma.Decimal }[],
  ): Prisma.Decimal {
    if (items.length === 0) {
      return new Prisma.Decimal(0);
    }

    let sumEmissions = new Prisma.Decimal(0);
    let sumVariance = new Prisma.Decimal(0); // sum( (E_i * U_i)^2 )

    for (const item of items) {
      sumEmissions = sumEmissions.add(item.emissions);

      // (E_i * U_i)^2
      const absoluteUncertainty = item.emissions.mul(item.uncertainty);
      const variance = absoluteUncertainty.pow(2);
      sumVariance = sumVariance.add(variance);
    }

    if (sumEmissions.isZero()) {
      return new Prisma.Decimal(0);
    }

    const rootSumVariance = sumVariance.sqrt();
    return rootSumVariance
      .div(sumEmissions)
      .toDecimalPlaces(this.PRECISION, Prisma.Decimal.ROUND_HALF_UP);
  }
}
