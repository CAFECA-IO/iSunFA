import { IAccount } from "@/constants/accounts";

export class SemanticAccountMatcher {
  private static exactCodeMap = new Map<IAccount[], Map<string, string>>();
  private static normalizedNameMap = new Map<IAccount[], Map<string, string>>();
  private static memoizedFallbackCache = new Map<
    IAccount[],
    Map<string, string>
  >();

  // Info: (20260520 - Tzuhan) [AUDIT FIX] CPA Multi-region Alias Override. 確保代碼絕對對應至字典中真實存在的項目。
  private static readonly COUNTRY_ALIASES: Record<
    string,
    Record<string, string>
  > = {
    TW: {
      CASH: "1101",
      CASH_IN_BANK: "1103",
      ACCOUNTS_RECEIVABLE: "1170",
      ACCOUNTS_PAYABLE: "2170",
      OTHER_PAYABLES: "2200",
      ACCRUED_RENT: "2202",
      REFUNDABLE_DEPOSITS: "1920",
      PREPAID_RENT: "1412",
      PREPAID_EXPENSE: "1410",
      REVENUE: "4111",
      EXPENSE: "6200",

      TELECOM_EXPENSE: "6215",
      SHIPPING_EXPENSE: "6214",
      UTILITIES_EXPENSE: "6218",
      TRAVEL_EXPENSE: "6213",
      MARKETING_EXPENSE: "6117",
      SOFTWARE_EXPENSE: "6215",
      OFFICE_SUPPLIES: "6212",
      RENT_EXPENSE: "6211",
      ENTERTAINMENT_EXPENSE: "6220",
      MISCELLANEOUS_EXPENSE: "6288",
    },
    US: {
      CASH: "1101",
      CASH_IN_BANK: "1103",
      ACCOUNTS_RECEIVABLE: "1170",
      ACCOUNTS_PAYABLE: "2170",
      OTHER_PAYABLES: "2200",
      ACCRUED_RENT: "2202",
      REFUNDABLE_DEPOSITS: "1920",
      PREPAID_RENT: "1412",
      PREPAID_EXPENSE: "1410",
      REVENUE: "4111",
      EXPENSE: "6200",
      TELECOM_EXPENSE: "6215",
      SHIPPING_EXPENSE: "6214",
      UTILITIES_EXPENSE: "6218",
      TRAVEL_EXPENSE: "6213",
      MARKETING_EXPENSE: "6117",
      SOFTWARE_EXPENSE: "6215",
      OFFICE_SUPPLIES: "6212",
      RENT_EXPENSE: "6211",
      ENTERTAINMENT_EXPENSE: "6220",
      MISCELLANEOUS_EXPENSE: "6288",
    },
    JP: {
      CASH: "1101",
      CASH_IN_BANK: "1103",
      ACCOUNTS_RECEIVABLE: "1170",
      ACCOUNTS_PAYABLE: "2170",
      OTHER_PAYABLES: "2200",
      ACCRUED_RENT: "2202",
      REFUNDABLE_DEPOSITS: "1920",
      PREPAID_RENT: "1412",
      PREPAID_EXPENSE: "1410",
      REVENUE: "4111",
      EXPENSE: "6200",
      TELECOM_EXPENSE: "6215",
      SHIPPING_EXPENSE: "6214",
      UTILITIES_EXPENSE: "6218",
      TRAVEL_EXPENSE: "6213",
      MARKETING_EXPENSE: "6117",
      SOFTWARE_EXPENSE: "6215",
      OFFICE_SUPPLIES: "6212",
      RENT_EXPENSE: "6211",
      ENTERTAINMENT_EXPENSE: "6220",
      MISCELLANEOUS_EXPENSE: "6288",
    },
    CN: {
      CASH: "1101",
      CASH_IN_BANK: "1103",
      ACCOUNTS_RECEIVABLE: "1170",
      ACCOUNTS_PAYABLE: "2170",
      OTHER_PAYABLES: "2200",
      ACCRUED_RENT: "2202",
      REFUNDABLE_DEPOSITS: "1920",
      PREPAID_RENT: "1412",
      PREPAID_EXPENSE: "1410",
      REVENUE: "4111",
      EXPENSE: "6200",
      TELECOM_EXPENSE: "6215",
      SHIPPING_EXPENSE: "6214",
      UTILITIES_EXPENSE: "6218",
      TRAVEL_EXPENSE: "6213",
      MARKETING_EXPENSE: "6117",
      SOFTWARE_EXPENSE: "6215",
      OFFICE_SUPPLIES: "6212",
      RENT_EXPENSE: "6211",
      ENTERTAINMENT_EXPENSE: "6220",
      MISCELLANEOUS_EXPENSE: "6288",
    },
    KR: {
      CASH: "1101",
      CASH_IN_BANK: "1103",
      ACCOUNTS_RECEIVABLE: "1170",
      ACCOUNTS_PAYABLE: "2170",
      OTHER_PAYABLES: "2200",
      ACCRUED_RENT: "2202",
      REFUNDABLE_DEPOSITS: "1920",
      PREPAID_RENT: "1412",
      PREPAID_EXPENSE: "1410",
      REVENUE: "4111",
      EXPENSE: "6200",
      TELECOM_EXPENSE: "6215",
      SHIPPING_EXPENSE: "6214",
      UTILITIES_EXPENSE: "6218",
      TRAVEL_EXPENSE: "6213",
      MARKETING_EXPENSE: "6117",
      SOFTWARE_EXPENSE: "6215",
      OFFICE_SUPPLIES: "6212",
      RENT_EXPENSE: "6211",
      ENTERTAINMENT_EXPENSE: "6220",
      MISCELLANEOUS_EXPENSE: "6288",
    },
    HK: {
      CASH: "1101",
      CASH_IN_BANK: "1103",
      ACCOUNTS_RECEIVABLE: "1170",
      ACCOUNTS_PAYABLE: "2170",
      OTHER_PAYABLES: "2200",
      ACCRUED_RENT: "2202",
      REFUNDABLE_DEPOSITS: "1920",
      PREPAID_RENT: "1412",
      PREPAID_EXPENSE: "1410",
      REVENUE: "4111",
      EXPENSE: "6200",
      TELECOM_EXPENSE: "6215",
      SHIPPING_EXPENSE: "6214",
      UTILITIES_EXPENSE: "6218",
      TRAVEL_EXPENSE: "6213",
      MARKETING_EXPENSE: "6117",
      SOFTWARE_EXPENSE: "6215",
      OFFICE_SUPPLIES: "6212",
      RENT_EXPENSE: "6211",
      ENTERTAINMENT_EXPENSE: "6220",
      MISCELLANEOUS_EXPENSE: "6288",
    },
  };

  private static normalize(str: string): string {
    return str.toLowerCase().replace(/\s+/g, "").replace(/[-_]/g, "");
  }

  private static initializeCache(dictionary: IAccount[]) {
    if (!this.exactCodeMap.has(dictionary)) {
      const codeMap = new Map<string, string>();
      const nameMap = new Map<string, string>();

      for (const acc of dictionary) {
        codeMap.set(acc.code, acc.code);
        nameMap.set(this.normalize(acc.name), acc.code);
      }

      this.exactCodeMap.set(dictionary, codeMap);
      this.normalizedNameMap.set(dictionary, nameMap);
      this.memoizedFallbackCache.set(dictionary, new Map<string, string>());
    }
  }

  static match(
    keyword: string,
    dictionary: IAccount[],
    country: string = "TW",
  ): string {
    if (!keyword) return dictionary[0]?.code || "UNKNOWN";

    this.initializeCache(dictionary);

    const codeMap = this.exactCodeMap.get(dictionary)!;
    const nameMap = this.normalizedNameMap.get(dictionary)!;
    const memoMap = this.memoizedFallbackCache.get(dictionary)!;

    // Info: (20260520 - Tzuhan) 1. Exact Match on Code
    if (codeMap.has(keyword)) return codeMap.get(keyword)!;

    // Info: (20260520 - Tzuhan) 2. Exact Match on Normalized Name
    const normKeyword = this.normalize(keyword);
    if (nameMap.has(normKeyword)) return nameMap.get(normKeyword)!;

    // Info: (20260520 - Tzuhan) 3. Match from Multi-region Aliases (COUNTRY_ALIASES)
    // Info: (20260520 - Tzuhan) We try uppercase for UniversalAccountTags, and also lowercase for backwards compatibility
    const upperKeyword = keyword.toUpperCase();
    const regionAliases =
      this.COUNTRY_ALIASES[country] || this.COUNTRY_ALIASES["TW"];

    // Info: (20260520 - Tzuhan) Convert to backwards compatible check just in case
    let aliasCode = regionAliases[upperKeyword];
    if (!aliasCode) {
      // Info: (20260520 - Tzuhan) For legacy text matches like "cash in bank", replace spaces with underscores and uppercase
      const legacyTag = upperKeyword.replace(/\s+/g, "_");
      aliasCode = regionAliases[legacyTag];
    }

    if (aliasCode) {
      if (codeMap.has(aliasCode)) return aliasCode;

      // Info: (20260520 - Tzuhan) If code not direct, find descendant? (Fallback to old logic if needed, but exact code usually works)
      const exactCode = dictionary.find(
        (a) => a.code === aliasCode || a.parentCode === aliasCode,
      );
      if (exactCode) return exactCode.code;
    }

    // Info: (20260520 - Tzuhan) 4. Memoized Fallback Cache
    if (memoMap.has(keyword)) return memoMap.get(keyword)!;

    // Info: (20260520 - Tzuhan) 5. O(N) Partial Match
    const matchName = dictionary.find(
      (a) => a.name.includes(keyword) || keyword.includes(a.name),
    );

    const result = matchName ? matchName.code : keyword;

    // Info: (20260520 - Tzuhan) Write back to memo
    memoMap.set(keyword, result);

    return result;
  }
}
