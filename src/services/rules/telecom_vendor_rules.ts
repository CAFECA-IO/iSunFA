export interface IExtractedData {
  documentType: "BILL_NOTICE" | "PAYMENT_RECEIPT" | "OTHER";
  amount: number;
}

// Info: (20260511 - Tzuhan) Stage 2 Deterministic Routing Rules
export function getChunghwaTelecomVoucherLines(extracted: IExtractedData) {
  // Info: (20260511 - Tzuhan) 情境 A：繳費通知 (建立負債)
  if (extracted.documentType === "BILL_NOTICE") {
    const tax = Math.round((extracted.amount * 0.05) / 1.05);
    const baseAmount = extracted.amount - tax;

    return [
      {
        accountingCode: "6262",
        particular: "市內電話上網型月租費",
        amount: baseAmount,
        isDebit: true,
      },
      {
        accountingCode: "1261",
        particular: "進項稅額",
        amount: tax,
        isDebit: true,
      },
      {
        accountingCode: "2141",
        particular: "應付費用-中華電信",
        amount: extracted.amount,
        isDebit: false,
      },
    ];
  }

  // Info: (20260511 - Tzuhan) 情境 B：繳費結果通知 (沖銷負債/現金流出)
  if (extracted.documentType === "PAYMENT_RECEIPT") {
    return [
      {
        accountingCode: "2141",
        particular: "沖銷應付費用-中華電信",
        amount: extracted.amount,
        isDebit: true,
      },
      {
        accountingCode: "1101",
        particular: "銀行存款-台新銀行",
        amount: extracted.amount,
        isDebit: false,
      },
    ];
  }

  return null; // Info: (20260511 - Tzuhan) 交給 Stage 3 AI Fallback
}
