import { fxInterceptorService } from "@/services/fx.interceptor.service";
import { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import { UniversalAccountTag } from "@/constants/enums";
import { describe, it, expect } from "@jest/globals";
import { getCrossExchangeRateStatic } from "@/skills/utils/exchange_rate_helper";
import { MoneyUtil } from "@/lib/utils/money";

describe("FxInterceptorService", () => {
  it("should convert taxAmount and create Realized FX Gain/Loss plug for multiple FX rates", () => {
    const payload: IAggregatedDocumentResult = {
      voucherBase: {
        vendor: "Test Vendor",
        currency: "USD",
        tradingDate: "2026-04-28",
        totalAmount: "1050", // Info: (20260527 - Tzuhan) 1000 base + 50 tax
        taxAmount: "50",
      },
      voucherLines: {
        lines: [
          {
            particular: "Accrued Payable Offset",
            amount: "1000",
            isDebit: true,
            semanticCategory: UniversalAccountTag.ACCOUNTS_PAYABLE,
            accountingCode: "",
            targetFxDate: "2026-03-31", // Info: (20260527 - Tzuhan) Historical rate: 31
          },
          {
            particular: "Tax Amount Offset",
            amount: "50",
            isDebit: true,
            semanticCategory: UniversalAccountTag.INPUT_TAX,
            accountingCode: "",
            targetFxDate: "2026-03-31", // Info: (20260527 - Tzuhan) Historical rate: 31
          },
          {
            particular: "Cash paid",
            amount: "1050",
            isDebit: false,
            semanticCategory: UniversalAccountTag.CASH,
            accountingCode: "",
            // Info: (20260527 - Tzuhan) No targetFxDate -> Uses tradingDate (2026-04-28) -> Rate: 30
          },
        ],
      },
    };

    const tradingDate = new Date("2026-04-28");
    const rate30 = getCrossExchangeRateStatic("USD", "TWD", tradingDate);
    const rate31 = getCrossExchangeRateStatic(
      "USD",
      "TWD",
      new Date("2026-03-31"),
    );

    const result = fxInterceptorService.interceptAndConvert(
      payload,
      "TWD",
      tradingDate,
    );

    // Info: (20260527 - Tzuhan) Assert taxAmount converted
    expect(result.voucherBase?.taxAmount).toBe(
      MoneyUtil.toDecimal(MoneyUtil.multiply("50", rate30.toString()))
        .round()
        .toString(),
    );
    expect(result.voucherBase?.totalAmount).toBe(
      MoneyUtil.toDecimal(MoneyUtil.multiply("1050", rate30.toString()))
        .round()
        .toString(),
    );

    // Info: (20260527 - Tzuhan) Check lines
    const lines = result.voucherLines?.lines || [];

    // Info: (20260527 - Tzuhan) Line 1: 1000 * rate31
    const l1 = MoneyUtil.toDecimal(
      MoneyUtil.multiply("1000", rate31.toString()),
    )
      .round()
      .toString();
    expect(lines[0].amount).toBe(l1);
    // Info: (20260527 - Tzuhan) Line 2: 50 * rate31
    const l2 = MoneyUtil.toDecimal(MoneyUtil.multiply("50", rate31.toString()))
      .round()
      .toString();
    expect(lines[1].amount).toBe(l2);
    // Info: (20260527 - Tzuhan) Line 3: 1050 * rate30
    const l3 = MoneyUtil.toDecimal(
      MoneyUtil.multiply("1050", rate30.toString()),
    )
      .round()
      .toString();
    expect(lines[2].amount).toBe(l3);

    // Info: (20260527 - Tzuhan) Diff
    const diffStr = MoneyUtil.subtract(MoneyUtil.add(l1, l2), l3);
    const diffDec = MoneyUtil.toDecimal(diffStr);

    expect(lines.length).toBe(4);
    const plugLine = lines[3];
    expect(plugLine.amount).toBe(diffDec.abs().toString());
    expect(plugLine.semanticCategory).toBe(
      UniversalAccountTag.FOREIGN_EXCHANGE_GAIN_OR_LOSS,
    );
    expect(plugLine.isDebit).toBe(diffDec.lessThan(0));
  });
});
