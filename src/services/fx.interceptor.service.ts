import { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { getCrossExchangeRateStatic } from "@/skills/utils/exchange_rate_helper";
import { FIAT_CURRENCIES } from "@/constants/country";
export class FxInterceptorService {
  /**
   * Info: (20260526 - Tzuhan) [ADR] FX Interceptor
   * 遵守架構分層原則，將外幣換匯邏輯 (Business Logic) 從 Repository 抽離到 Service 層。
   */
  interceptAndConvert(
    payload: IAggregatedDocumentResult,
    bookCurrency: string,
    tradingDate: Date,
  ): IAggregatedDocumentResult {
    // Info: (20260526 - Tzuhan) 複製一份 payload 避免 mutating 原物件
    const result = JSON.parse(
      JSON.stringify(payload),
    ) as IAggregatedDocumentResult;

    if (result.voucherBase) {
      const parsedCurrency = result.voucherBase.currency || bookCurrency;
      if (
        parsedCurrency !== bookCurrency &&
        FIAT_CURRENCIES.includes(parsedCurrency) &&
        FIAT_CURRENCIES.includes(bookCurrency)
      ) {
        const fxRate = getCrossExchangeRateStatic(
          parsedCurrency,
          bookCurrency,
          tradingDate,
        );

        // Info: (20260526 - Tzuhan) 替換幣別為本位幣
        result.voucherBase.currency = bookCurrency;

        // Info: (20260526 - Tzuhan) 加上 FX 轉換標記
        const fxNote = `[FX 換匯攔截器] 原始外幣: ${parsedCurrency}, 適用匯率: ${fxRate.toFixed(4)}, 強制寫入本位幣: ${bookCurrency}\n`;
        result.voucherBase.aiNote =
          fxNote + (result.voucherBase.aiNote ?? "無 AI 分析備註");

        // Info: (20260526 - Tzuhan) 轉換 VoucherBase 總金額 (PAYMENT_RECEIPT 等需要總金額的比對)
        const vBase = result.voucherBase as Record<string, unknown>;
        if (vBase.totalAmount) {
          const amtStr = String(vBase.totalAmount).replace(/,/g, "");
          const amtNum = Number(amtStr);
          if (!isNaN(amtNum)) {
            vBase.totalAmount = Math.round(amtNum * fxRate).toString();
          }
        }

        // Info: (20260526 - Tzuhan) 轉換 VoucherLines 各分錄金額
        if (result.voucherLines && Array.isArray(result.voucherLines.lines)) {
          for (const line of result.voucherLines.lines) {
            const amtStr = String(line.amount).replace(/,/g, "");
            const amtNum = Number(amtStr);
            if (!isNaN(amtNum)) {
              line.amount = Math.round(amtNum * fxRate).toString();
            }
          }
        }
      }
    }

    return result;
  }
}

export const fxInterceptorService = new FxInterceptorService();
