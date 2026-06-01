import { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { CountryCode } from "@/constants/enums";
import { TaxStrategyService } from "@/services/tax.strategy.service";
import { fxInterceptorService } from "@/services/fx.interceptor.service";
import { MoneyUtil } from "@/lib/utils/money";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
import { MOCK_EEIO_COEFFICIENTS } from "@/constants/mock_eeio_coefficients";
import { AccountingEngineService } from "@/services/accounting.engine.service";

export class VoucherPipelineOrchestrator {
  /**
   * Info: (20260528 - Tzuhan)
   * Orchestrates the entire processing of a dbSyncPayload object, including Early Normalization,
   * Cut-off event splitting, and Deterministic Pipeline Execution (FX & Tax).
   */
  public static async processDbSyncPayload(
    originalPayload: Record<string, unknown>,
    bookCurrency: string,
    bookCountry: string,
  ): Promise<Record<string, unknown>> {
    const newDbSyncPayload: Record<string, unknown> = {};

    for (const recordKey of Object.keys(originalPayload)) {
      const originalResult = originalPayload[
        recordKey
      ] as unknown as IAggregatedDocumentResult;

      // Info: (20260527 - Tzuhan) 早期防線 (Early Normalization)
      if (originalResult.voucherBase && originalResult.voucherBase.currency) {
        originalResult.voucherBase.currency = String(
          originalResult.voucherBase.currency,
        )
          .toUpperCase()
          .trim();
        if (originalResult.voucherBase.currency === "RMB") {
          originalResult.voucherBase.currency = "CNY";
        }
      }
      if (originalResult.esg && originalResult.esg.unit) {
        originalResult.esg.unit = String(originalResult.esg.unit)
          .toUpperCase()
          .trim();
        if (originalResult.esg.unit === "RMB") {
          originalResult.esg.unit = "CNY";
        }
      }

      // Info: (20260527 - Tzuhan) 1. 會計切斷 (Cut-off) - 一變多
      const splitResults = await AccountingEngineService.processCutoffEvents(
        originalResult,
        bookCurrency,
        bookCountry,
      );

      // Info: (20260527 - Tzuhan) 2. 決定論管線 (攔截器與換匯邏輯)
      const washedResults = splitResults.map((res) =>
        this.executePipeline(res, bookCurrency, bookCountry),
      );

      for (let idx = 0; idx < washedResults.length; idx++) {
        const splitSuffix = washedResults.length > 1 ? `-${idx}` : "";
        newDbSyncPayload[`${recordKey}${splitSuffix}`] = washedResults[idx];
      }
    }
    return newDbSyncPayload;
  }

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

    // Info: (20260601 - Tzuhan) 0. 攔截不應計算碳排的交易 (如股東注資、借款等 INCOME 類型)
    if (fileResult.voucherBase) {
      const vd = (fileResult.voucherBase.data ||
        fileResult.voucherBase) as Record<string, unknown>;
      const rawType = String(vd.tradingType || vd.type || "").toLowerCase();
      if (rawType === "income" || rawType === "receipt") {
        if (fileResult.esg) {
          delete fileResult.esg;
        }
      }
    }

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
          MoneyUtil.toDecimal(esgAmountStr)
            .minus(totalAmountStr)
            .abs()
            .lessThan(0.01)
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
