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

export class CoaVectorSearchService {
  /**
   * Info: (20260521 - Tzuhan)
   * Per-Line Deterministic RAG.
   * Upgrade: Implemented pure TS Cosine Similarity against Account Names and Descriptions.
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
}
