/**
 * Info: (20260518 - Tzuhan/Julian)
 * VendorRegistry
 *
 * 根據廠商名稱與單據類型，使用模糊比對回傳 CPA 認證的分錄陣列與 ESG 規則。
 */

import { VENDOR_RULES } from "@/constants/vendor_rules";
import { EsgScope } from "@/interfaces/esg";
import { MeasurementUnit } from "@/constants/enums";
import { EsgActivityTypeKey } from "@/constants/esg_activity_type";

export interface IEsgRule {
  esgScope?: EsgScope | null;
  esgActivityType?: EsgActivityTypeKey;
  esgUnit?: MeasurementUnit | string;
  suppressEsg?: boolean;
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

export class VendorRegistry {
  /**
   * Info: (20260518 - Tzuhan/Julian) 根據廠商名稱與單據類型，使用模糊比對回傳 CPA 認證的分錄陣列。
   */
  static match(
    vendorName: string,
    documentType: string = "ACCRUAL_NOTICE",
  ): IVendorRule[] | null {
    if (!vendorName) return null;

    const normalizedVendor = vendorName.toLowerCase().replace(/\s+/g, "");

    for (const mapping of VENDOR_RULES as IVendorEntry[]) {
      const matchFound = mapping.aliases.some((alias) =>
        normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
      );

      if (matchFound && mapping.rules[documentType]) {
        return mapping.rules[documentType];
      }
    }

    return null; // Info: (20260515 - Tzuhan) 交由後端模糊搜尋或 AI
  }

  /**
   * Info: (20260518 - Tzuhan/Julian) 根據廠商名稱與單據類型，決定 ESG 規則 (例如：是否凍結碳排計算)。
   */
  static matchEsg(
    vendorName: string,
    documentType: string = "ACCRUAL_NOTICE",
  ): IEsgRule | null {
    if (!vendorName) return null;

    const normalizedVendor = vendorName.toLowerCase().replace(/\s+/g, "");

    for (const mapping of VENDOR_RULES as IVendorEntry[]) {
      const matchFound = mapping.aliases.some((alias) =>
        normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
      );

      if (matchFound) {
        // Info: (20260518 - Tzuhan) 優先使用特定廠商定義的 ESG 規則
        if (mapping.esgRules && mapping.esgRules[documentType]) {
          return mapping.esgRules[documentType];
        }

        // Info: (20260515 - Julian) 預設退場機制：收據階段金流沖銷，碳排已算過，所以 suppressEsg
        if (documentType === "PAYMENT_RECEIPT") {
          return { suppressEsg: true };
        }

        return null;
      }
    }

    return null;
  }
}
