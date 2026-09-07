/**
 * Info: (20260812 - Luphia) `import type` —— 這支只用到型別。
 *
 * 寫成值匯入的話，`document_parser_db_sync → document_sync.repo → lib/prisma`
 * 整條會被拉進外部運算節點的模組圖（Executor 呼叫本檔的 processDbSyncPayload），
 * 而那個節點依 async_workers/00_async_worker_overview.md 不該連得到資料庫。
 * 型別在編譯後就消失，執行期本來就沒有這個依賴 —— 只是原本的寫法沒說出來。
 */
import type { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { CountryCode, NonEmissiveTransactionType } from "@/constants/enums";
import { TaxStrategyService } from "@/services/tax.strategy.service";
import { fxInterceptorService } from "@/services/fx.interceptor.service";
import { MoneyUtil } from "@/lib/utils/money";
import { AccountingEngineService } from "@/services/accounting.engine.service";
/**
 * Info: (20260907 - Luphia) 不再匯入 `EmissionFactorRepo`：本檔在外部運算
 * 節點的匯入圖裡（Executor 的洗淨步驟），那個匯入正是拆分後僅剩的 DB 耦合
 * 之一。係數字典改由呼叫端以 mission 快照提供；`coefficient_snapshot` 是
 * 刻意零 prisma 的純模組，值匯入不會把資料庫拉進圖（隔離測試釘住）。
 */
import {
  buildCoefficientDictionary,
  type ISnapshotCoefficient,
} from "@/lib/worker/coefficient_snapshot";
import { EsgCalculatorService } from "@/services/esg.calculator.service";
import { EsgActivityTypeKey } from "@/constants/esg_activity_type";
import {
  EsgActivityTypeToGhgMapping,
  EsgActivityTypeToIsoMapping,
} from "@/constants/esg";

export class VoucherPipelineOrchestrator {
  /**
   * Info: (20260528 - Tzuhan)
   * Orchestrates the entire processing of a dbSyncPayload object, including Early Normalization,
   * Cut-off event splitting, and Deterministic Pipeline Execution (FX & Tax).
   */
  /**
   * Info: (20260907 - Luphia) `coefficientDictionary` 由呼叫端提供（PR #6650
   * 收尾，原 ToDo 兩處之一）：本函式跑在外部運算節點（`mission.executor.service`
   * 的洗淨步驟），不得查資料庫。字典來自 mission 快照（發包端嵌入、隨 IPFS
   * 過界，見 `lib/worker/coefficient_snapshot`），與 esg_parsing 選出
   * `coefficientId` 用的是**同一份**——查得到是由建構保證的，不是巧合。
   * 查不到（字典撞不到 id）維持原行為：跳過校正與計算，不拋錯。
   */
  public static async processDbSyncPayload(
    originalPayload: Record<string, unknown>,
    bookCurrency: string,
    bookCountry: string,
    coefficientDictionary: Map<string, ISnapshotCoefficient>,
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
      const washedResults = await Promise.all(
        splitResults.map((res) =>
          this.executePipeline(
            res,
            bookCurrency,
            bookCountry,
            coefficientDictionary,
          ),
        ),
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
  public static async executePipeline(
    originalPayload: IAggregatedDocumentResult,
    bookCurrency: string,
    countryCode: string = "TW",
    /**
     * Info: (20260907 - Luphia) 係數字典由 processDbSyncPayload 傳下來（見該
     * 函式檔頭）。預設值是**靜態字典**而不是空 Map：直呼本函式的呼叫端
     *（測試、種子腳本）在改動前走的是 `getCoefficientById` 的「靜態先」
     * 分支——空 Map 會讓它們連靜態係數都查不到，靜默跳過校正與計算。
     */
    coefficientDictionary: Map<
      string,
      ISnapshotCoefficient
    > = buildCoefficientDictionary([]),
  ): Promise<IAggregatedDocumentResult> {
    // Info: (20260526 - Tzuhan) 深度複製以避免污染原始資料
    let fileResult = JSON.parse(
      JSON.stringify(originalPayload),
    ) as IAggregatedDocumentResult;

    // Info: (20260601 - Tzuhan) 0. 攔截不應計算碳排的交易 (如股東注資、借款等 INCOME 類型)
    if (fileResult.voucherBase) {
      const vd = (fileResult.voucherBase.data ||
        fileResult.voucherBase) as Record<string, unknown>;
      const rawType = String(
        vd.tradingType || vd.type || "",
      ).toLowerCase() as NonEmissiveTransactionType;
      if (
        rawType === NonEmissiveTransactionType.INCOME ||
        rawType === NonEmissiveTransactionType.RECEIPT
      ) {
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
      // Info: (20260907 - Luphia) 改查 mission 快照字典，不再查資料庫（見函式檔頭）
      const coef = coefficientDictionary.get(fileResult.esg.coefficientId);

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
      // Info: (20260907 - Luphia) 同上：mission 快照字典（見函式檔頭）
      const coef = coefficientDictionary.get(fileResult.esg.coefficientId);
      if (coef) {
        const convertedEsgAmount = fileResult.esg!.amount;

        // Info: (20260630 - Tzuhan) 多氣體支援引擎計算
        const calcResult = EsgCalculatorService.calculateEmissions(
          convertedEsgAmount || 0,
          coef,
        );

        fileResult.esg!.emissions = calcResult.emissions;

        if (
          calcResult.ghgBreakdown &&
          Object.keys(calcResult.ghgBreakdown).length > 0
        ) {
          fileResult.esg!.ghgBreakdown = calcResult.ghgBreakdown;
          fileResult.esg!.gwpVersion = calcResult.gwpVersion;
        }

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

    if (fileResult.esg && fileResult.esg.activityType) {
      const actType = fileResult.esg.activityType as EsgActivityTypeKey;
      if (EsgActivityTypeToGhgMapping[actType]) {
        fileResult.esg.ghgProtocolCategory =
          EsgActivityTypeToGhgMapping[actType];
      }
      if (EsgActivityTypeToIsoMapping[actType]) {
        fileResult.esg.isoCategory = EsgActivityTypeToIsoMapping[actType];
      }
    }

    return fileResult;
  }
}
