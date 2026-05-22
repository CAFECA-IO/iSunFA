/**
 * Info: (20260518 - Tzuhan/Julian)
 * VendorRegistry
 *
 * 根據廠商名稱與單據類型，使用模糊比對回傳 CPA 認證的分錄陣列與 ESG 規則。
 */

import { VENDOR_RULES } from "@/constants/vendor_rules";
import { DocumentType } from "@/constants/enums";
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
  taxIds?: string[];
  rules: {
    [documentType: string]: IVendorRule[];
  };
  esgRules?: {
    [documentType: string]: IEsgRule;
  };
}

export class VendorRegistry {
  private static taxIdIndex: Map<string, IVendorEntry> = new Map();

  static {
    for (const mapping of VENDOR_RULES as IVendorEntry[]) {
      if (mapping.taxIds) {
        for (const taxId of mapping.taxIds) {
          this.taxIdIndex.set(taxId, mapping);
        }
      }
    }
  }

  /**
   * Info: (20260521 - Tzuhan) 強制 O(1) 型別安全索引，不經過 DB
   */
  static match(
    vendorName: string,
    docType: DocumentType,
    vendorTaxIdStr?: string | null,
  ): IVendorRule[] | null {
    // Info: (20260521 - Tzuhan) 1. 統編 O(1) 決定論攔截 (最優先)
    if (vendorTaxIdStr) {
      const matchedMapping = this.taxIdIndex.get(vendorTaxIdStr);
      if (matchedMapping && matchedMapping.rules[docType]) {
        return matchedMapping.rules[docType];
      }
    }

    //Info: (20260521 - Tzuhan) 2. 名稱模糊比對 Fallback
    const normalizedVendor = vendorName
      ? vendorName.toLowerCase().replace(/\s+/g, "")
      : "";
    if (!normalizedVendor) return null;

    for (const mapping of VENDOR_RULES as IVendorEntry[]) {
      const matchFound = mapping.aliases.some((alias) =>
        normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
      );
      if (matchFound && mapping.rules[docType]) {
        return mapping.rules[docType];
      }
    }
    return null;
  }

  /**
   * Info: (20260518 - Tzuhan/Julian) 根據廠商名稱與單據類型，決定 ESG 規則
   */
  static matchEsg(
    vendorName: string,
    documentType: string = "ACCRUAL_NOTICE",
    taxId?: string | null,
  ): IEsgRule | null {
    if (!vendorName && !taxId) return null;

    if (taxId) {
      const matchedMapping = this.taxIdIndex.get(taxId);
      if (matchedMapping) {
        if (matchedMapping.esgRules && matchedMapping.esgRules[documentType]) {
          return matchedMapping.esgRules[documentType];
        }
        if (documentType === "PAYMENT_RECEIPT") {
          return { suppressEsg: true };
        }
        return null;
      }
    }

    const normalizedVendor = vendorName
      ? vendorName.toLowerCase().replace(/\s+/g, "")
      : "";
    if (normalizedVendor) {
      for (const mapping of VENDOR_RULES as IVendorEntry[]) {
        const matchFound = mapping.aliases.some((alias) =>
          normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
        );

        if (matchFound) {
          if (mapping.esgRules && mapping.esgRules[documentType]) {
            return mapping.esgRules[documentType];
          }
          if (documentType === "PAYMENT_RECEIPT") {
            return { suppressEsg: true };
          }
          return null;
        }
      }
    }

    return null;
  }
}
