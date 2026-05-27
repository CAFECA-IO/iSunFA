import { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { getCrossExchangeRateStatic } from "@/skills/utils/exchange_rate_helper";
import { FIAT_CURRENCIES } from "@/constants/country";
import { MoneyUtil } from "@/lib/utils/money";
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
          try {
            const amtStr = MoneyUtil.parseInput(String(vBase.totalAmount));
            vBase.totalAmount = MoneyUtil.toDecimal(
              MoneyUtil.multiply(amtStr, fxRate.toString()),
            )
              .round()
              .toString();
          } catch (e) {
            console.warn(
              "[FxInterceptorService] parseInput failed for totalAmount",
              e,
            );
          }
        }

        // Info: (20260527 - Tzuhan) 轉換 VoucherBase 稅額 (避免營業稅以原幣申報)
        if (vBase.taxAmount) {
          try {
            const taxAmtStr = MoneyUtil.parseInput(String(vBase.taxAmount));
            vBase.taxAmount = MoneyUtil.toDecimal(
              MoneyUtil.multiply(taxAmtStr, fxRate.toString()),
            )
              .round()
              .toString();
          } catch (e) {
            console.warn(
              "[FxInterceptorService] parseInput failed for taxAmount",
              e,
            );
          }
        }

        // Info: (20260526 - Tzuhan) 轉換 VoucherLines 各分錄金額，並處理四捨五入導致的匯差配平
        if (result.voucherLines && Array.isArray(result.voucherLines.lines)) {
          let totalDebit = "0";
          let totalCredit = "0";
          let maxDebitLineIndex = -1;
          let maxCreditLineIndex = -1;
          let maxDebitAmountStr = "-1";
          let maxCreditAmountStr = "-1";

          let hasMultipleFxRates = false;

          for (let i = 0; i < result.voucherLines.lines.length; i++) {
            const line = result.voucherLines.lines[i];
            try {
              let lineFxRate = fxRate;
              if (line.targetFxDate && typeof line.targetFxDate === "string") {
                const lineTradingDate = new Date(line.targetFxDate);
                lineFxRate = getCrossExchangeRateStatic(
                  parsedCurrency,
                  bookCurrency,
                  lineTradingDate,
                );
                hasMultipleFxRates = true;
              }

              const amtStr = MoneyUtil.parseInput(String(line.amount || "0"));
              const convertedStr = MoneyUtil.toDecimal(
                MoneyUtil.multiply(amtStr, lineFxRate.toString()),
              )
                .round()
                .toString();
              line.amount = convertedStr;

              if (line.isDebit) {
                totalDebit = MoneyUtil.add(totalDebit, convertedStr);
                if (
                  MoneyUtil.toDecimal(convertedStr).greaterThan(
                    MoneyUtil.toDecimal(maxDebitAmountStr),
                  )
                ) {
                  maxDebitAmountStr = convertedStr;
                  maxDebitLineIndex = i;
                }
              } else {
                totalCredit = MoneyUtil.add(totalCredit, convertedStr);
                if (
                  MoneyUtil.toDecimal(convertedStr).greaterThan(
                    MoneyUtil.toDecimal(maxCreditAmountStr),
                  )
                ) {
                  maxCreditAmountStr = convertedStr;
                  maxCreditLineIndex = i;
                }
              }
            } catch (e) {
              console.warn(
                `[FxInterceptorService] parseInput failed for line ${i}`,
                e,
              );
            }
          }

          // Info: (20260526 - Tzuhan) 處理配平差額
          if (totalDebit !== totalCredit) {
            const diffStr = MoneyUtil.subtract(totalDebit, totalCredit);
            const diffDec = MoneyUtil.toDecimal(diffStr);

            // Info: (20260527 - Tzuhan) [AUDIT FIX] 若有跨期換匯 (Multiple FX Rates)，尾差為已實現兌換損益，不可強塞給最大分錄
            if (hasMultipleFxRates) {
              if (diffDec.greaterThan(0)) {
                result.voucherLines.lines.push({
                  particular: "Realized Foreign Exchange Gain/Loss",
                  accountingCode: "",
                  semanticCategory: "FOREIGN_EXCHANGE_GAIN_OR_LOSS", // Using string since UniversalAccountTag enum might not be imported here, but it's equivalent
                  amount: diffStr,
                  isDebit: false,
                });
              } else if (diffDec.lessThan(0)) {
                result.voucherLines.lines.push({
                  particular: "Realized Foreign Exchange Gain/Loss",
                  accountingCode: "",
                  semanticCategory: "FOREIGN_EXCHANGE_GAIN_OR_LOSS",
                  amount: diffDec.abs().toString(),
                  isDebit: true,
                });
              }
            } else {
              // Info: (20260526 - Tzuhan) 單一匯率純粹四捨五入導致的尾差，配平給最大分錄 (Plug to the largest line)
              if (diffDec.greaterThan(0) && maxCreditLineIndex !== -1) {
                const line = result.voucherLines.lines[maxCreditLineIndex];
                line.amount = MoneyUtil.add(
                  String(line.amount || "0"),
                  diffStr,
                );
              } else if (diffDec.lessThan(0) && maxDebitLineIndex !== -1) {
                const line = result.voucherLines.lines[maxDebitLineIndex];
                line.amount = MoneyUtil.subtract(
                  String(line.amount || "0"),
                  diffStr,
                );
              }
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
        try {
          const esgAmtStr = MoneyUtil.parseInput(
            String(result.esg.amount || "0"),
          );
          result.esg.amount = MoneyUtil.multiply(esgAmtStr, fxRate.toString());
        } catch (e) {
          console.warn(
            "[FxInterceptorService] parseInput failed for ESG amount",
            e,
          );
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
