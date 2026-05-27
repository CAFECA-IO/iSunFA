import { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { CountryCode } from "@/constants/enums";
import { TaxStrategyService } from "@/services/tax.strategy.service";
import { fxInterceptorService } from "@/services/fx.interceptor.service";
import { MoneyUtil } from "@/lib/utils/money";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
import { MOCK_EEIO_COEFFICIENTS } from "@/constants/mock_eeio_coefficients";

export class VoucherPipelineOrchestrator {
  /**
   * Info: (20260526 - Tzuhan)
   * 在將 Payload 傳遞給 AccountingEngineService 或提交到區塊鏈之前，
   * 統籌執行所有決定性轉換 (Deterministic transformations) 的完整管線。
   */
  public static executePipeline(
    originalPayload: IAggregatedDocumentResult,
    bookCurrency: string,
    countryCode: string = "TW",
  ): IAggregatedDocumentResult {
    // Info: (20260526 - Tzuhan) 深度複製以避免污染原始資料
    let fileResult = JSON.parse(
      JSON.stringify(originalPayload),
    ) as IAggregatedDocumentResult;

    // Info: (20260526 - Tzuhan) 1. 稅務逆向攔截器 (Tax Reverse Charge Interceptor)
    // Info: (20260527 - Tzuhan) 傳遞 CountryCode 進入策略模式
    fileResult = TaxStrategyService.applyReverseChargeIfApplicable(
      fileResult,
      countryCode as CountryCode,
    );

    // Info: (20260526 - Tzuhan) 2. ESG 稅額自動校正 (ESG Tax Auto-Correction)
    if (fileResult.esg && fileResult.esg.coefficientId) {
      const allCoef = [...ALL_COEFFICIENTS, ...MOCK_EEIO_COEFFICIENTS];
      const coef = allCoef.find((c) => c.id === fileResult.esg!.coefficientId);

      if (coef) {
        const isEEIO = coef.id.startsWith("eeio");
        const esgAmountStr = MoneyUtil.parseInput(
          String(fileResult.esg.amount || "0"),
        );
        const totalAmountStr = MoneyUtil.parseInput(
          String(fileResult.voucherBase?.totalAmount || "0"),
        );
        const totalTaxStr = MoneyUtil.parseInput(
          String(fileResult.voucherBase?.taxAmount || "0"),
        );

        if (
          isEEIO &&
          MoneyUtil.toDecimal(totalTaxStr).greaterThan(0) &&
          MoneyUtil.toDecimal(esgAmountStr).minus(totalAmountStr).abs().lessThan(0.01)
        ) {
          const newEsgAmountStr = MoneyUtil.subtract(
            totalAmountStr,
            totalTaxStr,
          );
          fileResult.esg!.amount = newEsgAmountStr;
          fileResult.esg!.aiNote =
            (fileResult.esg!.aiNote || "") +
            "\n[Pipeline] Info: (20260526 - Tzuhan) 系統根據 ITAC 規範，將 ESG 金額從含稅總額自動校正為未稅淨額。";
        }
      }
    }

    // Info: (20260526 - Tzuhan) 3. 匯率攔截器 (FX Interceptor)
    const tradingDateStr = fileResult.voucherBase?.tradingDate;
    const tradingDate = tradingDateStr
      ? new Date(tradingDateStr as string)
      : new Date();
    fileResult = fxInterceptorService.interceptAndConvert(
      fileResult,
      bookCurrency,
      tradingDate,
    );

    // Info: (20260526 - Tzuhan) 4. 決定性 ESG 碳排運算 (使用換匯後的金額)
    if (fileResult.esg && fileResult.esg.coefficientId) {
      const allCoef = [...ALL_COEFFICIENTS, ...MOCK_EEIO_COEFFICIENTS];
      const coef = allCoef.find((c) => c.id === fileResult.esg!.coefficientId);
      if (coef) {
        const convertedEsgAmount = fileResult.esg!.amount;
        fileResult.esg!.emissions = MoneyUtil.multiply(
          String(convertedEsgAmount),
          String(coef.emissionFactor),
        );

        if (coef.source === "Internal_Proxy_Estimation_Based_On_Spend") {
          fileResult.esg!.aiNote =
            (fileResult.esg!.aiNote || "") +
            "\n*使用內部過渡期 EEIO 係數進行花費基礎估算，非官方直接宣告數值，待查核*";
        }

        // Info: (20260526 - Tzuhan) 強制寫入期程邊界，確保 Web3 SSOT 擁有跨期攤銷的數位證據
        if (fileResult.voucherBase) {
          if (fileResult.voucherBase.startDate)
            fileResult.esg!.startDate = String(
              fileResult.voucherBase.startDate,
            );
          if (fileResult.voucherBase.endDate)
            fileResult.esg!.endDate = String(fileResult.voucherBase.endDate);
          if (fileResult.voucherBase.tradingDate)
            fileResult.esg!.tradingDate = String(
              fileResult.voucherBase.tradingDate,
            );
        }
      }
    }

    return fileResult;
  }
}
