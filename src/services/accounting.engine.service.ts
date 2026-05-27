import { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { IParsedVoucherLine } from "@/interfaces/voucher";
import { UniversalAccountTag, EsgFallbackCategory } from "@/constants/enums";
export class AccountingEngineService {
  /**
   * Info: (20260526 - Tzuhan)
   * 評估憑證日期以決定跨期切斷策略 (估列 vs 預付)
   * 並據此派發事件。
   */
  public static async processCutoffEvents(
    payload: IAggregatedDocumentResult,
  ): Promise<IAggregatedDocumentResult[]> {
    const results: IAggregatedDocumentResult[] = [];

    if (!payload.voucherBase) {
      results.push(payload);
      return results;
    }

    const {
      tradingDate: tDateStr,
      startDate: sDateStr,
      endDate: eDateStr,
    } = payload.voucherBase;

    // Info: (20260526 - Tzuhan) 若未提供明確的交易日或服務期間，則假設為即期交易（無需跨期切斷）
    if (!tDateStr || !sDateStr || !eDateStr) {
      results.push(payload);
      return results;
    }

    const tradingDate = new Date(tDateStr as string);
    const endDate = new Date(eDateStr as string);

    const tradingMonth =
      tradingDate.getUTCFullYear() * 12 + tradingDate.getUTCMonth();
    const endMonth = endDate.getUTCFullYear() * 12 + endDate.getUTCMonth();

    // Info: (20260526 - Tzuhan) 情境 A: 後付制 (Post-paid) - 服務已於過去月份結束，但於今日付款
    if (endMonth < tradingMonth) {
      console.log(
        `[AccountingEngine] Post-paid cut-off detected: Service ended on ${eDateStr}, Paid on ${tDateStr}`,
      );

      // Info: (20260526 - Tzuhan) 計算服務月份的月底日期 (例如 3/31)
      const serviceMonthEnd = new Date(
        Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0),
      );

      // Info: (20260526 - Tzuhan) 1. 費用估列事件 (Accrued Expense Event)
      const accruedPayload = JSON.parse(
        JSON.stringify(payload),
      ) as IAggregatedDocumentResult;
      accruedPayload.voucherBase!.tradingDate = serviceMonthEnd
        .toISOString()
        .split("T")[0];
      accruedPayload.voucherBase!.aiNote =
        (accruedPayload.voucherBase!.aiNote || "") +
        "\n[AccountingEngine] 自動切斷(Cut-off) - 費用估列 (Accrued Expense)";

      // Info: (20260526 - Tzuhan) 覆寫估列的分錄 (借：原費用與進項稅額，貸：應付帳款或其他應付款)
      if (accruedPayload.voucherLines?.lines) {
        // Info: (20260527 - Tzuhan) CPA Review: 判斷此為營業進貨 (Trade) 或 非營業費用 (Non-trade) - Multi-language Safe
        const fallback = accruedPayload.voucherBase
          ?.fallbackCategory as EsgFallbackCategory;
        const tradeCategories = [
          EsgFallbackCategory.PLASTICS_AND_RUBBER,
          EsgFallbackCategory.METALS_AND_MINERALS,
          EsgFallbackCategory.PAPER_AND_WOOD,
          EsgFallbackCategory.ELECTRONICS_AND_ELECTRICAL,
          EsgFallbackCategory.CHEMICALS_AND_SOLVENTS,
          EsgFallbackCategory.AGRICULTURE_AND_FOOD,
          EsgFallbackCategory.TEXTILES_AND_APPAREL,
        ];

        const debitLines = accruedPayload.voucherLines.lines.filter(
          (l) =>
            l.isDebit && l.semanticCategory !== UniversalAccountTag.INPUT_TAX,
        );
        const hasTradeDebit = debitLines.some(
          (l) =>
            l.semanticCategory === UniversalAccountTag.INVENTORY ||
            l.semanticCategory === UniversalAccountTag.COST_OF_GOODS_SOLD,
        );

        const isTrade = tradeCategories.includes(fallback) || hasTradeDebit;

        const payableTag = isTrade
          ? UniversalAccountTag.ACCOUNTS_PAYABLE
          : UniversalAccountTag.OTHER_PAYABLES;

        accruedPayload.voucherLines.lines =
          accruedPayload.voucherLines.lines.map((line: IParsedVoucherLine) => {
            if (!line.isDebit) {
              return {
                ...line,
                particular: isTrade
                  ? "Accrued Trade Payable"
                  : "Accrued Other Payable",
                semanticCategory: payableTag,
                accountingCode: "",
              };
            }
            return line;
          });
      }

      // Info: (20260526 - Tzuhan) 2. 扣款沖銷事件 (Payment Offsetting Event)
      const paymentPayload = JSON.parse(
        JSON.stringify(payload),
      ) as IAggregatedDocumentResult;
      paymentPayload.voucherBase!.aiNote =
        (paymentPayload.voucherBase!.aiNote || "") +
        "\n[AccountingEngine] 自動切斷(Cut-off) - 應付款沖銷 (Payment Offset)";

      // Info: (20260526 - Tzuhan) 從付款事件中移除 ESG，因為已在估列時認列
      delete paymentPayload.esg;

      if (paymentPayload.voucherLines?.lines) {
        const fallback = paymentPayload.voucherBase
          ?.fallbackCategory as EsgFallbackCategory;
        const tradeCategories = [
          EsgFallbackCategory.PLASTICS_AND_RUBBER,
          EsgFallbackCategory.METALS_AND_MINERALS,
          EsgFallbackCategory.PAPER_AND_WOOD,
          EsgFallbackCategory.ELECTRONICS_AND_ELECTRICAL,
          EsgFallbackCategory.CHEMICALS_AND_SOLVENTS,
          EsgFallbackCategory.AGRICULTURE_AND_FOOD,
          EsgFallbackCategory.TEXTILES_AND_APPAREL,
        ];

        const debitLines = paymentPayload.voucherLines.lines.filter(
          (l) =>
            l.isDebit && l.semanticCategory !== UniversalAccountTag.INPUT_TAX,
        );
        const hasTradeDebit = debitLines.some(
          (l) =>
            l.semanticCategory === UniversalAccountTag.INVENTORY ||
            l.semanticCategory === UniversalAccountTag.COST_OF_GOODS_SOLD,
        );

        const isTrade = tradeCategories.includes(fallback) || hasTradeDebit;

        const payableTag = isTrade
          ? UniversalAccountTag.ACCOUNTS_PAYABLE
          : UniversalAccountTag.OTHER_PAYABLES;

        paymentPayload.voucherLines.lines =
          paymentPayload.voucherLines.lines.map((line: IParsedVoucherLine) => {
            if (line.isDebit) {
              return {
                ...line,
                particular: isTrade
                  ? "Accrued Trade Payable Offset"
                  : "Accrued Other Payable Offset",
                semanticCategory: payableTag,
                accountingCode: "",
                targetFxDate: serviceMonthEnd.toISOString().split("T")[0], // Info: (20260527 - Tzuhan) 鎖定前期匯率
              };
            }
            return line;
          });
      }

      results.push(accruedPayload);
      results.push(paymentPayload);
      return results;
    }

    // Info: (20260526 - Tzuhan) 情境 B: 預付制 (Pre-paid) - 今日付款，但服務涵蓋未來月份
    if (endMonth > tradingMonth) {
      console.log(
        `[AccountingEngine] Pre-paid cut-off detected: Paid on ${tDateStr}, Service ends on ${eDateStr}`,
      );

      // Info: (20260526 - Tzuhan) 1. 扣款事件 (付款當下 - 認列預付費用)
      const prepaidPayload = JSON.parse(
        JSON.stringify(payload),
      ) as IAggregatedDocumentResult;
      prepaidPayload.voucherBase!.aiNote =
        (prepaidPayload.voucherBase!.aiNote || "") +
        "\n[AccountingEngine] 自動切斷(Cut-off) - 預付費用認列 (Prepaid Asset)";

      // Info: (20260526 - Tzuhan) 修改為預付資產 (例如 1251)
      if (prepaidPayload.voucherLines?.lines) {
        prepaidPayload.voucherLines.lines =
          prepaidPayload.voucherLines.lines.map((line: IParsedVoucherLine) => {
            if (
              line.isDebit &&
              line.semanticCategory !== UniversalAccountTag.INPUT_TAX
            ) {
              const dominantExpense =
                line.semanticCategory || UniversalAccountTag.EXPENSE;
              return {
                ...line,
                particular: `Prepaid for: ${dominantExpense}`,
                semanticCategory: UniversalAccountTag.PREPAID_EXPENSE,
                accountingCode: "",
              };
            }
            return line;
          });
      }

      results.push(prepaidPayload);

      // Info: (20260526 - Tzuhan) 2. 將包含 startDate/endDate 的 Payload 傳回
      // document_sync.repo.ts 會在寫入 Voucher (Prepaid Asset 1251) 後，自動於資料庫建立 AmortizationSchedule，
      // 並由現有的 amortization.worker.service.ts 定期執行攤銷。
      return results;
    }

    // Info: (20260526 - Tzuhan) 預設：沒有跨月情況，原樣回傳
    results.push(payload);
    return results;
  }
}
