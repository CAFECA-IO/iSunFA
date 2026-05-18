import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";

export interface IExchangeRateRepository {
  getExchangeRateToTWD({
    currency,
    date,
  }: {
    currency: string;
    date: Date;
  }): Promise<{ rate: Prisma.Decimal } | null>;
}

export class ExchangeRateRepository implements IExchangeRateRepository {
  // Info: (20260514 - Julian) 從 DB 找出最接近 date 的 TWD 匯率(回傳匯率)
  async getExchangeRateToTWD({
    currency,
    date,
  }: {
    currency: string;
    date: Date;
  }) {
    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: {
        baseCurrency: "TWD",
        targetCurrency: currency,
        date: { lte: date }, // Info: (20260514 - Julian) 往前回溯，避免使用到未來的匯率
      },
      orderBy: { date: "desc" },
    });

    if (!exchangeRate) return null;

    return { rate: exchangeRate.rate };
  }
}

export const exchangeRateRepo = new ExchangeRateRepository();
