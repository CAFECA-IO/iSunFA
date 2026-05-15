/**
 * Info: (20260515 - Tzuhan)
 * VendorRegistry (Mock Facade)
 *
 * 這是為了 Post-Parsing 架構而建置的 Mock Registry。
 * 在 Ticket 5 完成 Alias Array 或是 Embedding 升級前，
 * 此檔案僅提供一個非常迷你的測試用陣列，用來驗證攔截器。
 */

import { ACCOUNTS } from "@/constants/accounts";
import { EsgScope } from "@/interfaces/esg";
import { MeasurementUnit } from "@/constants/enums";
import { EsgActivityTypeKey } from "@/constants/esg_activity_type";

const getTwCode = (code: string) =>
  ACCOUNTS.TW.find((a) => a.code === code)?.code || code;

export interface IEsgRule {
  esgScope?: EsgScope | null;
  esgActivityType?: EsgActivityTypeKey;
  esgUnit?: MeasurementUnit;
  suppressEsg?: boolean;
  newCoefficient?: {
    name: string;
    emissionFactor: number;
    unit: string;
    description: string;
    source: string;
  };
}

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
  esgRules?: {
    [documentType: string]: IEsgRule;
  };
}

const MOCK_VENDOR_RULES: IVendorEntry[] = [
  {
    vendorId: "chunghwa_telecom",
    aliases: ["中華電信", "中華電信股份有限公司", "chunghwa telecom", "cht"],
    rules: {
      PAYMENT_RECEIPT: [
        { accountingCode: getTwCode("2171"), isDebit: true }, // Info: (20260515 - Tzuhan) 借：應付帳款 (沖銷)
        { accountingCode: getTwCode("1103"), isDebit: false }, // Info: (20260515 - Tzuhan) 貸：銀行存款
      ],
      BILL_NOTICE: [
        { accountingCode: getTwCode("6215"), isDebit: true }, // Info: (20260515 - Tzuhan) 借：管理費用 - 郵電費
        { accountingCode: getTwCode("2171"), isDebit: false }, // Info: (20260515 - Tzuhan) 貸：應付帳款
      ],
    },
    esgRules: {
      PAYMENT_RECEIPT: {
        suppressEsg: true,
      },
      BILL_NOTICE: {
        esgScope: EsgScope.SCOPE_3,
        esgActivityType: "PURCHASED_GOODS",
        esgUnit: MeasurementUnit.TWD,
        newCoefficient: {
          name: "電信服務",
          emissionFactor: 0.065,
          unit: "kgCO2e/TWD",
          description:
            "此為基於台灣產業關聯表估算得出，適用於電信服務類別的平均排放係數。",
          source: "台灣環保署 EIO-LCA 模型",
        },
      },
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

    const normalizedDocType =
      documentType.toUpperCase().includes("PAYMENT") ||
      documentType.toUpperCase().includes("RECEIPT")
        ? "PAYMENT_RECEIPT"
        : "BILL_NOTICE";

    const normalizedVendor = vendorName.toLowerCase().replace(/\s+/g, "");

    for (const vendor of MOCK_VENDOR_RULES) {
      const matchFound = vendor.aliases.some((alias) =>
        normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
      );

      if (matchFound && vendor.rules[normalizedDocType]) {
        return vendor.rules[normalizedDocType];
      }
    }

    return null; // Info: (20260515 - Tzuhan) 交由後端模糊搜尋或 AI
  }

  static matchEsg(
    vendorName: string,
    documentType: string = "BILL_NOTICE",
  ): IEsgRule | null {
    if (!vendorName) return null;

    const normalizedDocType =
      documentType.toUpperCase().includes("PAYMENT") ||
      documentType.toUpperCase().includes("RECEIPT")
        ? "PAYMENT_RECEIPT"
        : "BILL_NOTICE";

    const normalizedVendor = vendorName.toLowerCase().replace(/\s+/g, "");

    for (const vendor of MOCK_VENDOR_RULES) {
      const matchFound = vendor.aliases.some((alias) =>
        normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
      );

      if (matchFound && vendor.esgRules && vendor.esgRules[normalizedDocType]) {
        return vendor.esgRules[normalizedDocType];
      }
    }

    return null;
  }
}
