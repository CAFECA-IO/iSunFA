import { TaxStrategyService } from "@/services/tax.strategy.service";
import { CountryCode, DocumentType, UniversalAccountTag } from "@/constants/enums";
import type { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { describe, it, expect } from "@jest/globals";

describe("TaxStrategyService - Reverse Charge & Capitalization", () => {
  it("Scenario 1: Normal Deductible Expense (e.g. AWS Hosting)", () => {
    const payload: IAggregatedDocumentResult = {
      voucherBase: {
        vendor: "AWS Cloud",
        vendorTaxId: "FOREIGN123", // Info: (20260527 - Tzuhan) Non-Taiwanese
        documentType: DocumentType.PAYMENT_RECEIPT,
        totalAmount: "1000",
        taxAmount: "0", // Info: (20260527 - Tzuhan) Before reverse charge
        currency: "TWD",
        tradingDate: "2026-05-27",
        tradingType: "OUTCOME",
        confidence: 100,
      },
      voucherLines: {
        aiNote: "",
        lines: [
          {
            particular: "Hosting Fee",
            amount: "1000",
            isDebit: true,
            semanticCategory: UniversalAccountTag.EXPENSE,
            accountingCode: "",
          },
        ],
      },
    };

    const result = TaxStrategyService.applyReverseChargeIfApplicable(payload, CountryCode.TW);

    // Info: (20260527 - Tzuhan) Assert that 5% tax was generated correctly
    const taxLines = result.voucherLines!.lines!.filter(l => l.amount === "50");
    expect(taxLines.length).toBe(2); // Info: (20260527 - Tzuhan) One debit, one credit

    const inputTaxLine = taxLines.find(l => l.isDebit);
    const outputTaxLine = taxLines.find(l => !l.isDebit);

    // Info: (20260527 - Tzuhan) It should be fully deductible INPUT_TAX
    expect(inputTaxLine?.semanticCategory).toBe(UniversalAccountTag.INPUT_TAX);
    expect(outputTaxLine?.semanticCategory).toBe(UniversalAccountTag.OUTPUT_TAX);
  });

  it("Scenario 2: Non-Deductible Expense (Capitalization, e.g. Entertainment)", () => {
    const payload: IAggregatedDocumentResult = {
      voucherBase: {
        vendor: "Adobe Creative Cloud",
        vendorTaxId: "FOREIGN123",
        documentType: DocumentType.PAYMENT_RECEIPT,
        totalAmount: "2000",
        taxAmount: "0",
        currency: "TWD",
        tradingDate: "2026-05-27",
        tradingType: "OUTCOME",
        confidence: 100,
      },
      voucherLines: {
        aiNote: "",
        lines: [
          {
            particular: "Gift for client design",
            amount: "2000",
            isDebit: true,
            semanticCategory: UniversalAccountTag.ENTERTAINMENT_EXPENSE,
            accountingCode: "",
          },
        ],
      },
    };

    const result = TaxStrategyService.applyReverseChargeIfApplicable(payload, CountryCode.TW);

    // Info: (20260527 - Tzuhan) Assert that 5% tax (100) was generated correctly
    const taxLines = result.voucherLines!.lines!.filter(l => l.amount === "100");
    expect(taxLines.length).toBe(2);

    const inputTaxLine = taxLines.find(l => l.isDebit);
    const outputTaxLine = taxLines.find(l => !l.isDebit);

    // Info: (20260527 - Tzuhan) The input tax should NOT be INPUT_TAX, it must be capitalized into ENTERTAINMENT_EXPENSE
    expect(inputTaxLine?.semanticCategory).toBe(UniversalAccountTag.ENTERTAINMENT_EXPENSE);
    expect(inputTaxLine?.particular).toContain("Non-deductible, Capitalized");
    expect(outputTaxLine?.semanticCategory).toBe(UniversalAccountTag.OUTPUT_TAX);
  });

  it("Scenario 3: EU VAT Guardrail (Should not calculate automatically)", () => {
    const payload: IAggregatedDocumentResult = {
      voucherBase: {
        vendor: "Hetzner Online",
        vendorTaxId: "999999999", // Info: (20260527 - Tzuhan) Invalid EU VAT number to trigger foreign warning
        documentType: DocumentType.PAYMENT_RECEIPT,
        totalAmount: "100",
        currency: "EUR",
        tradingDate: "2026-05-27",
      }
    };

    const result = TaxStrategyService.applyReverseChargeIfApplicable(payload, CountryCode.EU);

    // Info: (20260527 - Tzuhan) Asserts that no auto-tax calculation occurred due to complex EU VAT directive
    expect(result.voucherLines?.lines?.length || 0).toBe(0);
    // Info: (20260527 - Tzuhan) Asserts that AI Note has the correct warning
    expect(result.voucherBase?.aiNote).toContain("EU VAT Reverse Charge might be applicable");
  });
});
