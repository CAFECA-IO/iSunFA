import {
  getChunghwaTelecomVoucherLines,
  IExtractedData,
} from "@/services/rules/telecom_vendor_rules";
import { VENDOR_RULES } from "@/constants/vendor_rules";
import { EsgScope } from "@/interfaces/esg";
import { EsgActivityTypeKey } from "@/constants/esg_activity_type";

// Info: (20260511 - Tzuhan) Stage 2 黃金廠商映射註冊表 (Strategy Registry)
// 確保未來擴充廠商時符合 OCP 開閉原則
export const VENDOR_RULE_REGISTRY: Record<
  string,
  (extracted: IExtractedData) => unknown
> = {
  中華電信: getChunghwaTelecomVoucherLines,
};

export interface IEsgRule {
  esgScope?: EsgScope | null;
  esgActivityType?: EsgActivityTypeKey;
  esgUnit?: string;
  suppressEsg?: boolean;
}

export class VendorRegistry {
  /**
   * Info: (20260515 - Julian) 根據廠商名稱與單據類型，使用模糊比對回傳 CPA 認證的分錄陣列。
   */
  static match(
    vendorName: string,
    documentType: string = "BILL_NOTICE",
  ): { accountingCode: string; isDebit: boolean }[] | null {
    if (!vendorName) return null; // Info: (20260515 - Julian) 處理無效輸入

    // Info: (20260515 - Julian) 將輸入字串轉小寫並移除所有空白，以便比對
    const normalizedVendor = vendorName.toLowerCase().replace(/\s+/g, "");

    for (const mapping of VENDOR_RULES) {
      // Info: (20260515 - Julian) 針對別名陣列進行「去空白+轉小寫」的歸一化處理，再行比對
      const matchFound = mapping.aliases.some((alias) =>
        normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
      );

      if (matchFound) {
        // Info: (20260515 - Julian) 根據 documentType 從規則集讀取對應分錄
        const rules = mapping.rules[documentType as keyof typeof mapping.rules];
        if (rules) {
          return rules;
        }
      }
    }

    return null; // Info: (20260515 - Julian) 若無匹配，交由 AI Fallback
  }

  /**
   * Info: (20260515 - Julian) 根據廠商名稱與單據類型，決定 ESG 規則 (例如：是否凍結碳排計算)。
   */
  static matchEsg(
    vendorName: string,
    documentType: string = "BILL_NOTICE",
  ): IEsgRule | null {
    if (!vendorName) return null; // Info: (20260515 - Julian) 處理無效輸入

    // Info: (20260515 - Julian) 將輸入字串轉小寫並移除所有空白，以便比對
    const normalizedVendor = vendorName.toLowerCase().replace(/\s+/g, "");

    for (const mapping of VENDOR_RULES) {
      const matchFound = mapping.aliases.some((alias) =>
        normalizedVendor.includes(alias.toLowerCase().replace(/\s+/g, "")),
      );

      if (matchFound) {
        if (documentType === "PAYMENT_RECEIPT") {
          // Info: (20260515 - Julian) 收據階段：代表金流沖銷，碳排已經在帳單階段算過，所以 suppressEsg
          return { suppressEsg: true };
        }

        // Info: (20260515 - Julian) 若無匹配，交由 AI Fallback
        return null;
      }
    }

    return null; // Info: (20260515 - Julian) 若無匹配，交由 AI Fallback
  }
}
