/**
 * Info: (20260515 - Tzuhan)
 * VendorRegistry (Mock Facade)
 *
 * 這是為了 Post-Parsing 架構而建置的 Mock Registry。
 * 在 Ticket 5 完成 Alias Array 或是 Embedding 升級前，
 * 此檔案僅提供一個非常迷你的測試用陣列，用來驗證攔截器。
 */

export interface IVendorRule {
  accountingCode: string;
  isDebit: boolean;
}

export interface IVendorEntry {
  vendorId: string;
  aliases: string[];
  rules: {
    [documentType: string]: IVendorRule[];
  };
}

const MOCK_VENDOR_RULES: IVendorEntry[] = [
  {
    vendorId: "chunghwa_telecom",
    aliases: ["中華電信", "中華電信股份有限公司", "chunghwa telecom", "cht"],
    rules: {
      PAYMENT_RECEIPT: [
        { accountingCode: "2141", isDebit: true }, // Info: (20260515 - Tzuhan) 借：應付帳款 (沖銷)
        { accountingCode: "1101", isDebit: false }, // Info: (20260515 - Tzuhan) 貸：銀行存款
      ],
      BILL_NOTICE: [
        { accountingCode: "6261", isDebit: true }, // Info: (20260515 - Tzuhan) 借：郵電費
        { accountingCode: "2141", isDebit: false }, // Info: (20260515 - Tzuhan) 貸：應付帳款
      ],
    },
  },
];

export class VendorRegistry {
  /**
   * Info: (20260515 - Tzuhan)
   * 根據廠商名稱與單據類型，比對並回傳對應的會計科目分錄規則。
   * 若無精準匹配，回傳 null，交由 AI Fallback。
   */
  static match(
    vendorName: string,
    documentType: string = "BILL_NOTICE",
  ): IVendorRule[] | null {
    if (!vendorName) return null;

    const normalizedVendor = vendorName.toLowerCase().replace(/\s+/g, "");

    for (const vendor of MOCK_VENDOR_RULES) {
      const matchFound = vendor.aliases.some((alias) =>
        normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
      );

      if (matchFound && vendor.rules[documentType]) {
        return vendor.rules[documentType];
      }
    }

    return null; // Info: (20260515 - Tzuhan) 交由後端模糊搜尋或 AI
  }
}
