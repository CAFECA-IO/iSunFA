import { ACCOUNTS, IAccount } from "@/constants/accounts";

export class CoaVectorService {
  /**
   * Info: (20260521 - Tzuhan) COA 向量檢索 Mock (Vector RAG Mock)
   * 根據文本關鍵字，模擬向量檢索，回傳 Top-K 的會計科目。
   * 以便在 Sprint 2 無縫抽換 SQLite-vss。
   */
  static search(
    queryText: string,
    country: string = "TW",
    topK: number = 3,
  ): IAccount[] {
    const accountList = (ACCOUNTS[country as keyof typeof ACCOUNTS] ||
      ACCOUNTS["TW"]) as IAccount[];

    if (!queryText) return accountList.slice(0, topK);

    const normalizedQuery = queryText.toLowerCase().trim();

    // Info: (20260521 - Tzuhan) 簡單的 TF-IDF / 關鍵字命中排序 (Mock)
    const scoredAccounts = accountList.map((acc) => {
      let score = 0;
      const normalizedName = acc.name.toLowerCase();
      const normalizedCode = acc.code.toLowerCase();

      if (normalizedName.includes(normalizedQuery)) score += 10;
      if (normalizedCode.includes(normalizedQuery)) score += 5;

      // Info: (20260521 - Tzuhan) 模糊加分
      const queryWords = normalizedQuery.split(" ");
      queryWords.forEach((word) => {
        if (word && normalizedName.includes(word)) score += 2;
      });

      return { acc, score };
    });

    scoredAccounts.sort((a, b) => b.score - a.score);

    return scoredAccounts.slice(0, topK).map((item) => item.acc);
  }
}
