import { IAccount } from "@/constants/accounts";

// Info: (20260520 - Tzuhan) [REFACTOR] 實作純粹的樹狀溯源演算法，嚴禁使用 `startsWith` 等字串判斷。
export class AccountUtil {
  // Info: (20260520 - Tzuhan) [AUDIT FIX] 靜態全域快取 (Static Cache)，避免 O(N) 效能死結
  private static dictionaryCache = new Map<IAccount[], Map<string, IAccount>>();

  private static getCache(dictionary: IAccount[]): Map<string, IAccount> {
    let cache = this.dictionaryCache.get(dictionary);
    if (!cache) {
      cache = new Map<string, IAccount>();
      for (const acc of dictionary) {
        cache.set(acc.code, acc);
      }
      this.dictionaryCache.set(dictionary, cache);
    }
    return cache;
  }

  static getAccount(
    code: string,
    dictionary: IAccount[],
  ): IAccount | undefined {
    return this.getCache(dictionary).get(code);
  }

  /**
   * Info: (20260520 - Tzuhan)
   * 向上尋找 parentCode，確認 targetCode 是否為 rootCode 的子孫節點。
   * 時間複雜度：O(1) 快取查找與 O(h) 樹遍歷。
   */
  static isDescendantOf(
    targetCode: string,
    rootCode: string,
    dictionary: IAccount[],
  ): boolean {
    if (targetCode === rootCode) return true;

    const codeMap = this.getCache(dictionary);

    let currentCode = targetCode;
    const visited = new Set<string>();

    while (currentCode) {
      if (visited.has(currentCode)) {
        break; // Info: (20260520 - Tzuhan) [REFACTOR] 防呆：避免資料庫髒資料導致無窮迴圈
      }
      visited.add(currentCode);

      if (currentCode === rootCode) {
        return true;
      }

      const currentAcc = codeMap.get(currentCode);
      if (!currentAcc || !currentAcc.parentCode) {
        break; // Info: (20260520 - Tzuhan) 已達根節點 (無 parent) 或是找不到對應科目
      }

      currentCode = currentAcc.parentCode;
    }

    return false;
  }
}
