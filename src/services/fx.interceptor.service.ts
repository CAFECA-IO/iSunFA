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

        // Info: (20260526 - Tzuhan) 轉換 VoucherLines 各分錄金額，並處理四捨五入導致的匯差配平
        if (result.voucherLines && Array.isArray(result.voucherLines.lines)) {
          let totalDebit = 0;
          let totalCredit = 0;
          let maxDebitLineIndex = -1;
          let maxCreditLineIndex = -1;
          let maxDebitAmount = -1;
          let maxCreditAmount = -1;

          for (let i = 0; i < result.voucherLines.lines.length; i++) {
            const line = result.voucherLines.lines[i];
            const amtStr = String(line.amount).replace(/,/g, "");
            const amtNum = Number(amtStr);
            if (!isNaN(amtNum)) {
              const converted = Math.round(amtNum * fxRate);
              line.amount = converted.toString();

              if (line.isDebit) {
                totalDebit += converted;
                if (converted > maxDebitAmount) {
                  maxDebitAmount = converted;
                  maxDebitLineIndex = i;
                }
              } else {
                totalCredit += converted;
                if (converted > maxCreditAmount) {
                  maxCreditAmount = converted;
                  maxCreditLineIndex = i;
                }
              }
            }
          }

          // Info: (20260526 - Tzuhan) 處理配平差額 (Plug to the largest line)
          if (totalDebit !== totalCredit) {
            const diff = totalDebit - totalCredit;
            if (diff > 0 && maxCreditLineIndex !== -1) {
              const line = result.voucherLines.lines[maxCreditLineIndex];
              line.amount = (Number(line.amount) + diff).toString();
            } else if (diff < 0 && maxDebitLineIndex !== -1) {
              const line = result.voucherLines.lines[maxDebitLineIndex];
              line.amount = (Number(line.amount) - diff).toString();
            }
          }
        }
      }
    }

    // Info: (20260526 - Tzuhan) 攔截 ESG 物件，處理碳排金額外幣換算
    if (result.esg) {
      const esgUnit = result.esg.unit || bookCurrency;
      if (
        esgUnit !== bookCurrency &&
        FIAT_CURRENCIES.includes(esgUnit) &&
        FIAT_CURRENCIES.includes(bookCurrency)
      ) {
        const fxRate = getCrossExchangeRateStatic(
          esgUnit,
          bookCurrency,
          tradingDate,
        );

        // Info: (20260526 - Tzuhan) 轉換金額與碳排量 (利用分配律: (Amount * FX) * Coef = (Amount * Coef) * FX)
        const esgAmtStr = String(result.esg.amount).replace(/,/g, "");
        const esgAmtNum = Number(esgAmtStr);
        if (!isNaN(esgAmtNum)) {
          result.esg.amount = esgAmtNum * fxRate;
        }

        const esgEmsStr = String(result.esg.emissions || "0").replace(/,/g, "");
        const esgEmsNum = Number(esgEmsStr);
        if (!isNaN(esgEmsNum)) {
          // Info: (20260526 - Tzuhan) 因為 Two-Turn RAG 已預先使用未換匯的金額計算過 emissions，我們在此將 emissions 也乘上匯率，達成等式配平。
          result.esg.emissions = (esgEmsNum * fxRate).toString();
        }

        // Info: (20260526 - Tzuhan) 替換幣別為本位幣
        result.esg.unit = bookCurrency;

        // Info: (20260526 - Tzuhan) 加上 FX 轉換標記
        const fxNote = `\n[FX 換匯攔截器] 碳盤查原始花費: ${esgUnit}, 適用匯率: ${fxRate.toFixed(4)}, 已轉換為本位幣: ${bookCurrency} 進行係數乘算。`;
        result.esg.aiNote = (result.esg.aiNote ?? "") + fxNote;
      }
    }

    return result;
  }
}

export const fxInterceptorService = new FxInterceptorService();
