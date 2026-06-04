import { AccountingEngineService } from "@/services/accounting.engine.service";
import { DocumentType, UniversalAccountTag } from "@/constants/enums";
import type { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { describe, it, expect } from "@jest/globals";

// Info: (20260526 - Tzuhan) 移除了 BullMQ mock，因為系統已改用原生 AmortizationSchedule 處理預付攤銷

describe("AccountingEngineService Cut-off Logic", () => {
  it("Scenario A: Post-paid Cut-off (Accrued Expense)", async () => {
    const payload: IAggregatedDocumentResult = {
      voucherBase: {
        vendor: "AWS",
        documentType: DocumentType.PAYMENT_RECEIPT,
        totalAmount: "1000",
        taxAmount: "50",
        currency: "TWD",
        tradingDate: "2026-04-28", // Info: (20260526 - Tzuhan) 4月付款
        tradingType: "OUTCOME",
        startDate: "2026-03-01", // Info: (20260526 - Tzuhan) 3月服務期間
        endDate: "2026-03-31",
        aiNote: "AWS Bill for March",
        confidence: 95,
      },
      voucherLines: {
        aiNote: "",
        lines: [
          {
            particular: "AWS Hosting",
            amount: "1000",
            isDebit: true,
            semanticCategory: "Expense",
            accountingCode: "",
          },
          {
            particular: "Credit Card Payment",
            amount: "1000",
            isDebit: false,
            semanticCategory: UniversalAccountTag.CASH_IN_BANK,
            accountingCode: "",
          },
        ],
      },
      esg: {
        generationSource: "EEIO",
        confidence: 90,
        amount: 1000,
        unit: "TWD",
        emissions: "50",
        coefficientId: "eeio-aws",
      },
    };

    const results = await AccountingEngineService.processCutoffEvents(payload);

    expect(results[0].voucherLines!.lines!.length).toBe(2);
    expect(results[0].voucherLines!.lines![0].particular).toBe("AWS Hosting");
    expect(results[0].voucherLines!.lines![1].particular).toBe(
      "Accrued Other Payable",
    );
    expect(results[1].voucherLines!.lines!.length).toBe(2);
    expect(results[1].voucherLines!.lines![0].particular).toBe(
      "[沖銷] AWS Hosting (Offset)",
    );
    expect(results[0].esg).toBeDefined();

    // Info: (20260526 - Tzuhan) 事件 2: 付款沖銷 (Payment Offset)
    expect(results[1].voucherBase?.tradingDate).toBe("2026-04-28");
    expect(results[1].voucherLines!.lines![0].semanticCategory).toBe(
      UniversalAccountTag.OTHER_PAYABLES,
    );
    expect(results[1].voucherLines!.lines![1].semanticCategory).toBe(
      UniversalAccountTag.CASH_IN_BANK,
    );
    expect(results[1].esg).toBeUndefined(); // Info: (20260526 - Tzuhan) ESG 已在估列時認列
  });

  it("Scenario B: Pre-paid Cut-off (Amortization)", async () => {
    const payload: IAggregatedDocumentResult = {
      voucherBase: {
        vendor: "Adobe",
        documentType: DocumentType.PAYMENT_RECEIPT,
        totalAmount: "3000",
        taxAmount: "150",
        currency: "TWD",
        tradingDate: "2026-04-01", // Info: (20260526 - Tzuhan) 4月付款
        tradingType: "OUTCOME",
        startDate: "2026-04-01",
        endDate: "2026-06-30", // Info: (20260526 - Tzuhan) 服務於 6 月結束 (共 3 個月)
        aiNote: "Adobe Annual Plan",
        confidence: 95,
      },
      voucherLines: {
        aiNote: "",
        lines: [
          {
            particular: "Adobe Subscription",
            amount: "3000",
            isDebit: true,
            semanticCategory: "Expense",
            accountingCode: "",
          },
          {
            particular: "Credit Card Payment",
            amount: "3000",
            isDebit: false,
            semanticCategory: UniversalAccountTag.CASH_IN_BANK,
            accountingCode: "",
          },
        ],
      },
      esg: {
        generationSource: "EEIO",
        confidence: 90,
        amount: 3000,
        unit: "TWD",
        emissions: "150",
        coefficientId: "eeio-adobe",
      },
    };

    const results = await AccountingEngineService.processCutoffEvents(payload);

    // Info: (20260526 - Tzuhan) 針對預付制，回傳 1 個即時事件 (預付資產)，而 amortizationSchedule 會在後續 syncDocumentResultToDatabase 中由系統自動建立
    expect(results.length).toBe(1);

    // Info: (20260526 - Tzuhan) 事件 1: 付款 (預付資產)
    expect(results[0].voucherLines!.lines!.length).toBe(2);
    expect(results[0].voucherLines!.lines![0].particular).toBe(
      "[預付] Adobe Subscription",
    );
    expect(results[0].voucherLines!.lines![1].semanticCategory).toBe(
      UniversalAccountTag.CASH_IN_BANK,
    );
    expect(results[0].esg).toBeDefined(); // Info: (20260526 - Tzuhan) ESG 附加於原始憑證
  });
});
