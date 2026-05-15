import { Prisma } from "@/generated";

export interface IConversionParams {
  amount: number | Prisma.Decimal | bigint;
  fromCurrency: string;
  toCurrency: string;
  date: Date;
}

export interface IConversionResult {
  convertedAmount: Prisma.Decimal;
  exchangeRate: Prisma.Decimal;
}

/**
 * Info: (20260515 - Tzuhan)
 * ExchangeRateService (Mock Facade)
 *
 * 這是為了 Post-Parsing 架構而建置的 Mock Service。
 * 在 Ticket 4 (FX CronJob) 完成前，此介面將直接放行，或針對測試幣別提供假定匯率。
 */
export class ExchangeRateService {
  static async convert({
    amount,
    fromCurrency,
    toCurrency,
  }: IConversionParams): Promise<IConversionResult> {
    const inputAmount = new Prisma.Decimal(amount.toString());

    if (fromCurrency === toCurrency) {
      return {
        convertedAmount: inputAmount,
        exchangeRate: new Prisma.Decimal(1),
      };
    }

    // Info: (20260515 - Tzuhan) Mock: 如果遇到 USD 轉 TWD，預設給 32 的匯率供測試
    if (fromCurrency === "USD" && toCurrency === "TWD") {
      const mockRate = new Prisma.Decimal(32);
      return {
        convertedAmount: inputAmount.mul(mockRate),
        exchangeRate: mockRate,
      };
    }

    // Info: (20260515 - Tzuhan) 預設 Fallback: 原封不動回傳 (匯率 1)
    return {
      convertedAmount: inputAmount,
      exchangeRate: new Prisma.Decimal(1),
    };
  }
}
