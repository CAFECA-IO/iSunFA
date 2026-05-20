import { IAccount } from "@/constants/accounts";

export class SemanticAccountMatcher {
  private static exactCodeMap = new Map<IAccount[], Map<string, string>>();
  private static normalizedNameMap = new Map<IAccount[], Map<string, string>>();
  private static memoizedFallbackCache = new Map<
    IAccount[],
    Map<string, string>
  >();

  // Info: (20260520 - Tzuhan) [AUDIT FIX] CPA Level Override. other payables 應對應至 2200 其他應付款，而非 2209。
  private static readonly CUSTOM_ALIASES: Record<string, string> = {
    cash: "1101",
    "cash in bank": "1103",
    "accounts receivable": "1170",
    "accounts payable": "2170",
    "other payables": "2200",
    "refundable deposits": "1920",
    "guarantee deposits paid": "1920",
    "prepaid rent": "1412",
    "prepaid expense": "1250",
    revenue: "4111",
    expense: "6200",
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

  static match(keyword: string, dictionary: IAccount[]): string {
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

    // Info: (20260520 - Tzuhan) 3. Match from Custom Aliases
    const lowerKeyword = keyword.toLowerCase();
    if (this.CUSTOM_ALIASES[lowerKeyword]) {
      const aliasCode = this.CUSTOM_ALIASES[lowerKeyword];
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
