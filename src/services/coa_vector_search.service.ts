import { ACCOUNTS } from "@/constants/accounts";
import { SemanticAccountMatcher } from "@/lib/utils/semantic_account_matcher";
import { CountryCode } from "@/constants/enums";

export class CoaVectorSearchService {
  /**
   * Info: (20260521 - Tzuhan)
   * Per-Line Deterministic RAG.
   * Currently wraps SemanticAccountMatcher. Once coa_embeddings.json is deployed,
   * this will be upgraded to perform pure TS Cosine Similarity against the loaded embeddings.
   */
  static match(
    particular: string,
    accountBookCountry: CountryCode = CountryCode.TW,
  ): string {
    const dictionary = ACCOUNTS[accountBookCountry] || ACCOUNTS[CountryCode.TW];

    // Info: (20260521 - Tzuhan) Fallback to semantic account matcher until coa_embeddings.json is available
    return SemanticAccountMatcher.match(
      particular,
      dictionary,
      accountBookCountry,
    );
  }
}
