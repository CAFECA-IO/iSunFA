import { IAccount } from "@/constants/accounts";

// Info: (20260520 - Tzuhan) [REFACTOR] 實作純粹的樹狀溯源演算法，嚴禁使用 `startsWith` 等字串判斷。
export class AccountUtil {
  /**
   * Info: (20260520 - Tzuhan)
   * 向上尋找 parentCode，確認 targetCode 是否為 rootCode 的子孫節點。
   * 時間複雜度：O(h) 其中 h 為樹的深度。
   */
  static isDescendantOf(
    targetCode: string,
    rootCode: string,
    dictionary: IAccount[],
  ): boolean {
    if (targetCode === rootCode) return true;

    // Info: (20260520 - Tzuhan) [REFACTOR] 建立 O(1) 查找表，避免遞迴每次 O(N) 搜索。這裡可用 WeakMap/Map，但為了效能直接建立。
    // Info: (20260520 - Tzuhan) 在正式環境中，這個 Map 應該被 Cache 起來，但這裡維持純函數無狀態。
    const codeMap = new Map<string, IAccount>();
    for (const acc of dictionary) {
      codeMap.set(acc.code, acc);
    }

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
