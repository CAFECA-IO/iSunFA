import { FINANCIAL_OPENAPI_ENDPOINTS } from "@/constants/company_observatory";
import {
  IFinancialFactInput,
  IFinancialSyncSummary,
  IObservatoryHttpClient,
} from "@/interfaces/company_observatory";
import { parseJsonBody } from "@/lib/company_observatory/content";
import { parseFinancialRows } from "@/lib/company_observatory/financial_facts";
import { describeError } from "@/lib/utils/error_message";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20261023 - Luphia) 財務數字同步：逐一抓 24 支 OpenAPI 端點，解析後以「公司 × 期別 × 報表」覆寫。
 *
 * 一支端點失敗只記 log、不影響其他端點，下次排程再抓；寫入是覆寫，所以重跑不會重複。
 * 沒有 LLM、沒有計算，只搬運來源原值（CLAUDE.md §8）。
 */

export interface IFinancialFactSyncDeps {
  http: IObservatoryHttpClient;
  writeFacts: (facts: IFinancialFactInput[]) => Promise<number>;
  now: () => Date;
  shouldStop: () => boolean;
}

export async function syncFinancialFacts(
  deps: IFinancialFactSyncDeps,
): Promise<IFinancialSyncSummary> {
  const summary: IFinancialSyncSummary = {
    endpoints: 0,
    failedEndpoints: 0,
    companies: 0,
    facts: 0,
  };
  const companies = new Set<string>();

  for (const endpoint of FINANCIAL_OPENAPI_ENDPOINTS) {
    if (deps.shouldStop()) break;
    summary.endpoints += 1;
    try {
      const res = await deps.http.request(endpoint.url);
      if (res.status !== 200) {
        throw new Error(`HTTP ${res.status}`);
      }
      const facts = parseFinancialRows(
        parseJsonBody(res.body),
        endpoint,
        deps.now(),
      );
      summary.facts += await deps.writeFacts(facts);
      for (const fact of facts) companies.add(fact.stockId);
    } catch (error) {
      summary.failedEndpoints += 1;
      logger.warn("financial facts endpoint failed", {
        url: endpoint.url,
        error: describeError(error),
      });
    }
  }
  summary.companies = companies.size;
  return summary;
}
