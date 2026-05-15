import {
  getChunghwaTelecomVoucherLines,
  IExtractedData,
} from "@/services/rules/telecom_vendor_rules";
import { COMMON_VENDOR_MAPPINGS } from "@/constants/vendor";
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

    for (const mapping of COMMON_VENDOR_MAPPINGS) {
      // Info: (20260515 - Julian) 處理含有別名或括號的情況，例如 "統一超商 (7-11)" 拆分成 ['統一超商', '7-11']
      const aliases = mapping.vendorName
        .split(/[\s\(\)（）/]+/)
        .filter(Boolean)
        .map((s) => s.toLowerCase());

      // Info: (20260515 - Julian) 只要任一別名存在於發票廠商名稱中，即視為配對成功
      const matchFound = aliases.some((alias) =>
        normalizedVendor.includes(alias),
      );

      if (matchFound) {
        // Info: (20260515 - Julian) 如果有複合科目（如 6115/6111），取第一項
        const expenseCode = mapping.accountCode.split("/")[0];

        if (documentType === "PAYMENT_RECEIPT") {
          /* Info: (20260515 - Julian) 收據/繳費結果：代表已付款，沖銷負債並減少現金。 */
          return [
            { accountingCode: "2141", isDebit: mapping.isDebit }, // 借：應付帳款 (沖銷)
            { accountingCode: "1101", isDebit: !mapping.isDebit }, // 貸：銀行存款
          ];
        }

        // Info: (20260515 - Julian) 預設為 BILL_NOTICE (帳單/繳費通知)：認列費用與負債。
        return [
          { accountingCode: expenseCode, isDebit: mapping.isDebit }, // Info: (20260515 - Julian) 借：費用
          { accountingCode: "2141", isDebit: !mapping.isDebit }, // Info: (20260515 - Julian) 貸：應付帳款
        ];
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

    for (const mapping of COMMON_VENDOR_MAPPINGS) {
      // Info: (20260515 - Julian) 處理含有別名或括號的情況，例如 "統一超商 (7-11)" 拆分成 ['統一超商', '7-11']
      const aliases = mapping.vendorName
        .split(/[\s\(\)（）/]+/)
        .filter(Boolean)
        .map((s) => s.toLowerCase());

      const matchFound = aliases.some((alias) =>
        normalizedVendor.includes(alias),
      );

      if (matchFound) {
        if (documentType === "PAYMENT_RECEIPT") {
          // Info: (20260515 - Julian) 收據階段：代表金流沖銷，碳排已經在帳單階段算過，所以 suppressEsg
          return { suppressEsg: true };
        }

        /* TODO: (20260515 - Julian)
         ** 未來若 `COMMON_VENDOR_MAPPINGS` 擴充了 ESG 屬性，可於此返回對應的 scope 與 type。
         ** 目前針對 BILL_NOTICE 階段沒有特定的預設規則，交由下游管線進行 AI 分析 */
        return null;
      }
    }

    return null; // Info: (20260515 - Julian) 若無匹配，交由 AI Fallback
  }
}
