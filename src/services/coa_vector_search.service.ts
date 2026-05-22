import { ACCOUNTS } from "@/constants/accounts";
import { SemanticAccountMatcher } from "@/lib/utils/semantic_account_matcher";
import { CountryCode } from "@/constants/enums";

// Info: (20260522 - Tzuhan) 簡易版 Bigram Cosine Similarity (TF-IDF 近似替代方案)
function getBigrams(text: string): Map<string, number> {
  const bigrams = new Map<string, number>();
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  if (normalized.length < 2) {
    if (normalized.length > 0) bigrams.set(normalized, 1);
    return bigrams;
  }
  for (let i = 0; i < normalized.length - 1; i++) {
    const bg = normalized.substring(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
  }
  return bigrams;
}

function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>,
): number {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  for (const [bg, count] of vec1.entries()) {
    mag1 += count * count;
    if (vec2.has(bg)) {
      dotProduct += count * vec2.get(bg)!;
    }
  }
  for (const count of vec2.values()) {
    mag2 += count * count;
  }
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * Info: (20260522 - Tzuhan)
 * 什麼是 RAG？
 * RAG 是 Retrieval-Augmented Generation (檢索增強生成) 的縮寫。
 * 它的核心精神是：「不要讓 AI 憑空瞎猜，而是先幫 AI 檢索出參考資料，再讓 AI 根據參考資料來生成答案。」
 *
 * CoaVectorSearchService 的作用：
 * 它是我們 Two-Turn RAG 引擎中的「檢索器 (Retriever)」。
 * 因為系統中有數百個會計科目 (Chart of Accounts, COA)，直接全部塞給 LLM 會導致 Token 浪費與 AI 幻覺。
 * 因此，這個 Service 會利用純 TypeScript 實作的 Bigram Cosine Similarity (餘弦相似度) 演算法，
 * 將使用者憑證上的交易摘要 (particular) 與我們的標準科目字典進行比對，快速篩選出相似度最高的前 N 個候選科目。
 *
 * 為什麼這麼做？
 * 1. 降低成本與延遲：本地端直接計算相似度，完全不需要呼叫外部 API。
 * 2. 避免幻覺：強制 AI 只能從我們檢索出的 Top 10 候選名單中做「選擇題」，而不是讓 AI 自由發揮創造不存在的科目。
 * 3. 動態適應：取代過去僵硬寫死的 Vendor MDM 規則，能更動態地根據摘要的語意來推薦科目。
 */
export class CoaVectorSearchService {
  /**
   * Info: (20260521 - Tzuhan)
   * 單筆精準匹配 (Per-Line Deterministic RAG)。
   * 主要用於簡單場景或是 Fallback，直接返回相似度最高的一個會計科目代碼。
   */
  static match(
    particular: string,
    accountBookCountry: CountryCode = CountryCode.TW,
  ): string {
    const dictionary = ACCOUNTS[accountBookCountry] || ACCOUNTS[CountryCode.TW];

    // Info: (20260521 - Tzuhan) 擷取 "-" 前面的交易項目，過濾掉廠商名稱雜訊
    const cleanQuery = particular.split("-")[0].trim();
    if (!cleanQuery) return "UNKNOWN";

    const queryVec = getBigrams(cleanQuery);
    let bestMatchCode = "UNKNOWN";
    let bestScore = -1;

    for (const account of dictionary) {
      // Info: (20260522 - Tzuhan) 結合科目名稱與描述，作為該科目的 Document Text
      const docText = `${account.name} ${account.description}`;
      const docVec = getBigrams(docText);
      const score = cosineSimilarity(queryVec, docVec);

      if (score > bestScore) {
        bestScore = score;
        bestMatchCode = account.code;
      }
    }

    // Info: (20260522 - Tzuhan) 若餘弦相似度過低 (例如 < 0.1)，則啟動 SemanticAccountMatcher 作為最終 Fallback，若再找不到則交給系統懸記
    if (bestScore < 0.1) {
      return SemanticAccountMatcher.match(
        cleanQuery.toLowerCase(),
        dictionary,
        accountBookCountry,
      );
    }

    return bestMatchCode;
  }

  /**
   * Info: (20260522 - Tzuhan)
   * Fetches the Top N candidate account codes based on Cosine Similarity.
   * Used for Turn 2 AI Selection (Two-Turn RAG).
   */
  static matchTopN(
    particular: string,
    accountBookCountry: CountryCode = CountryCode.TW,
    limit: number = 10,
  ): string[] {
    const dictionary = ACCOUNTS[accountBookCountry] || ACCOUNTS[CountryCode.TW];

    const cleanQuery = particular.split("-")[0].trim();
    if (!cleanQuery) return [];

    const queryVec = getBigrams(cleanQuery);
    const scoredAccounts: { code: string; score: number }[] = [];

    for (const account of dictionary) {
      const docText = `${account.name} ${account.description}`;
      const docVec = getBigrams(docText);
      const score = cosineSimilarity(queryVec, docVec);
      scoredAccounts.push({ code: account.code, score });
    }

    // Sort descending by score
    scoredAccounts.sort((a, b) => b.score - a.score);

    return scoredAccounts.slice(0, limit).map((a) => a.code);
  }
}
