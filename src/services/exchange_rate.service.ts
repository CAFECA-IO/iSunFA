/*
 ** Info: (20260514 - Julian) 實作匯率相關的服務
 ** 查詢邏輯
 ** 1. 從 DB 找出最接近 date 的匯率
 ** 2. 若查無資料，拋出明確的 Error。
 ** 3. 將計算後的結果回傳
 ** 4. 必須使用 Prisma.Decimal 確保計算精度無誤
 */

// ToDo: (20260514 - Julian) 後續開發還要使用 Prisma，先保留
import { Prisma } from "@/generated";
import { exchangeRateRepo } from "@/repositories/exchange_rate.repo";

export class ExchangeRateService {
  // Info: (20260514 - Julian) 找出最接近 date 的 TWD 匯率
  async getExchangeRateToTWD({
    currency,
    date,
  }: {
    currency: string;
    date: Date;
  }): Promise<{ exchangeRate: Prisma.Decimal }> {
    try {
      const exchangeRate = await exchangeRateRepo.getExchangeRateToTWD({
        currency,
        date,
      });

      if (!exchangeRate) {
        throw new Error(`No exchange rate found for ${currency} on ${date}`);
      }

      return { exchangeRate: exchangeRate.rate };
    } catch (error) {
      console.error("Failed to get exchange rate:", error);
      throw error;
    }
  }

  /* Info: (20260514 - Julian) 交叉匯率處理：若要求 TWD 以外的匯率轉換，則需要透過 TWD 作為中介橋樑進行換算（回傳匯率）
   ** 1. 若 fromCurrency === toCurrency：直接回傳原金額與匯率 1
   ** 2. 若其中一個是 TWD：直接查表換算
   ** 3. 若都不是，進行交叉匯率 (Cross-Rate) 處理 */
  async getCrossExchangeRate({
    fromCurrency,
    toCurrency,
    date,
  }: {
    fromCurrency: string;
    toCurrency: string;
    date: Date;
  }): Promise<{ exchangeRate: Prisma.Decimal }> {
    try {
      // Info: (20260514 - Julian) 狀況 1: 若 fromCurrency === toCurrency，直接回傳原金額與匯率 1
      if (fromCurrency === toCurrency) {
        return { exchangeRate: new Prisma.Decimal(1) };
      }

      // Info: (20260514 - Julian) 狀況 2: 如果 fromCurrency 或 toCurrency 是 TWD，直接調用 getExchangeRateToTWD
      if (fromCurrency === "TWD") {
        // Info: (20260514 - Julian) 從 TWD 換成目標幣
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

      // Info: (20260514 - Julian) 狀況 3: 若無直接匯率，則透過 TWD 作為中介橋樑進行換算
      const fromCurrencyRate = await this.getExchangeRateToTWD({
        currency: fromCurrency,
        date,
      });
      const toCurrencyRate = await this.getExchangeRateToTWD({
        currency: toCurrency,
        date,
      });

      if (!fromCurrencyRate || !toCurrencyRate) {
        throw new Error(
          `No exchange rate found for ${fromCurrency} or ${toCurrency} on ${date}`,
        );
      }

      // Info: (20260514 - Julian) fromCurrency / toCurrency = 交叉匯率
      const crossRate = fromCurrencyRate.exchangeRate.div(
        toCurrencyRate.exchangeRate,
      );

      return { exchangeRate: crossRate };
    } catch (error) {
      console.error("Failed to get exchange rate:", error);
      throw error;
    }
  }

  // Info (20260514 - Julian): 將 fromCurrency 轉換為 toCurrency（回傳金額與匯率）
  async convertCurrency({
    amount,
    fromCurrency,
    toCurrency,
    date,
  }: {
    amount: bigint;
    fromCurrency: string;
    toCurrency: string;
    date: Date;
  }): Promise<{ convertedAmount: bigint; exchangeRate: Prisma.Decimal }> {
    try {
      // Info: (20260514 - Julian) 取得 fromCurrency -> toCurrency 的匯率
      const { exchangeRate } = await this.getCrossExchangeRate({
        fromCurrency,
        toCurrency,
        date,
      });

      // Info: (20260514 - Julian) 使用 decimal.js 處理高精度計算
      const amountDecimal = new Prisma.Decimal(amount.toString());
      const convertedDecimal = amountDecimal.mul(exchangeRate);

      // Info: (20260514 - Julian) 將計算結果四捨五入到整數後轉成 BigInt
      const convertedAmount = BigInt(convertedDecimal.toFixed(0));

      return { convertedAmount, exchangeRate };
    } catch (error) {
      console.error("Failed to convert to base currency:", error);
      throw error;
    }
  }
}

export const exchangeRateService = new ExchangeRateService();
