// ToDo: (20260514 - Julian) 後續開發還要使用 Prisma，先保留
import { Prisma } from "@/generated";
import { exchangeRateRepo } from "@/repositories/exchange_rate.repo";

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

// Info: (20260515 - Tzuhan) ExchangeRateService
export class ExchangeRateService {
  // Info: (20260518 - Tzuhan) Refactor: 升級為 static method 以符合 Facade 模式
  static async convert({
    amount,
    fromCurrency,
    toCurrency,
    date, // Info: (20260518 - Tzuhan) 補上 date
  }: IConversionParams): Promise<IConversionResult> {
    const inputAmount = new Prisma.Decimal(amount.toString());

    // Info: (20260518 - Tzuhan) 1. 同幣別直接放行
    if (fromCurrency === toCurrency) {
      return {
        convertedAmount: inputAmount,
        exchangeRate: new Prisma.Decimal(1),
      };
    }

    // Info: (20260518 - Tzuhan) 2. 呼叫 Julian 寫好的真實跨幣別查詢邏輯
    const { exchangeRate } = await this.getCrossExchangeRate({
      fromCurrency,
      toCurrency,
      date,
    });

    // Info: (20260518 - Tzuhan) 3. 維持 Prisma.Decimal 精度流轉，絕不提早轉 BigInt
    return {
      convertedAmount: inputAmount.mul(exchangeRate),
      exchangeRate: exchangeRate,
    };
  }

  /*
   ** Info: (20260514 - Julian) 實作匯率相關的服務
   ** 查詢邏輯
   ** 1. 從 DB 找出最接近 date 的匯率
   ** 2. 若查無資料，拋出明確的 Error。
   ** 3. 將計算後的結果回傳
   ** 4. 必須使用 Prisma.Decimal 確保計算精度無誤
   */
  static async getExchangeRateToTWD({
    currency,
    date,
  }: {
    currency: string;
    date: Date;
  }): Promise<{ exchangeRate: Prisma.Decimal }> {
    const exchangeRate = await exchangeRateRepo.getExchangeRateToTWD({
      currency,
      date,
    });

    if (!exchangeRate) {
      throw new Error(`No exchange rate found for ${currency} on ${date}`);
    }

    return { exchangeRate: exchangeRate.rate };
  }

  /**
   * Info: (20260514 - Julian) 交叉匯率處理
   * Info: (20260518 - Tzuhan) Refactor: 導入 Promise.all 併發查詢，並升級為 static
   */
  static async getCrossExchangeRate({
    fromCurrency,
    toCurrency,
    date,
  }: {
    fromCurrency: string;
    toCurrency: string;
    date: Date;
  }): Promise<{ exchangeRate: Prisma.Decimal }> {
    // Info: (20260514 - Julian) 狀況 1: 相同幣別
    if (fromCurrency === toCurrency) {
      return { exchangeRate: new Prisma.Decimal(1) };
    }

    // Info: (20260514 - Julian) 狀況 2: 其中包含 TWD
    if (fromCurrency === "TWD") {
      const toRate = await this.getExchangeRateToTWD({
        currency: toCurrency,
        date,
      });
      return { exchangeRate: new Prisma.Decimal(1).div(toRate.exchangeRate) };
    }
    if (toCurrency === "TWD") {
      // Info: (20260514 - Julian) 從目標幣換成 TWD
      const fromRate = await this.getExchangeRateToTWD({
        currency: fromCurrency,
        date,
      });
      return { exchangeRate: fromRate.exchangeRate };
    }

    // Info: (20260518 - Tzuhan) 狀況 3: 非 TWD 間的交叉匯率 (優化：使用 Promise.all 併發向資料庫查詢)
    const [fromRateResult, toRateResult] = await Promise.all([
      this.getExchangeRateToTWD({ currency: fromCurrency, date }),
      this.getExchangeRateToTWD({ currency: toCurrency, date }),
    ]);

    if (!fromRateResult || !toRateResult) {
      throw new Error(
        `No exchange rate found for ${fromCurrency} or ${toCurrency} on ${date}`,
      );
    }

    // Info: (20260514 - Julian) fromCurrency / toCurrency = 交叉匯率
    const crossRate = fromRateResult.exchangeRate.div(
      toRateResult.exchangeRate,
    );
    return { exchangeRate: crossRate };
  }
}
// Info: (20260518 - Tzuhan) 已全面改用 Static Facade，廢除底下的 new Instance
