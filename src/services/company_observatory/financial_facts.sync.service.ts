import {
  FINANCIAL_OPENAPI_ENDPOINTS,
  MOPS_SUMMARY_EMPTY_MARKER,
  MOPS_SUMMARY_URL,
  MOPS_THROTTLE_MARKERS,
} from "@/constants/company_observatory";
import {
  IFinancialFactInput,
  IFinancialSyncSummary,
  IObservatoryHttpClient,
} from "@/interfaces/company_observatory";
import { parseJsonBody } from "@/lib/company_observatory/content";
import { parseFinancialRows } from "@/lib/company_observatory/financial_facts";
import {
  backfillKey,
  mopsSummaryRequestBody,
  parseMopsSummaryHtml,
  planFinancialBackfill,
} from "@/lib/company_observatory/mops_financial_summary";
import { describeError } from "@/lib/utils/error_message";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20261023 - Luphia) 財務數字同步：逐一抓 24 支 OpenAPI 端點，解析後以「公司 × 期別 × 報表」覆寫；
 * 接著向 MOPS 彙總報表回補 OpenAPI 沒有的期別（近 3 年、申報季中的期別每天重查）。
 *
 * 一支端點失敗只記 log、不影響其他端點，下次排程再抓；寫入是覆寫，所以重跑不會重複。
 * 沒有 LLM、沒有計算，只搬運來源原值（CLAUDE.md §8）。
 */

export interface IFinancialFactSyncDeps {
  http: IObservatoryHttpClient;
  writeFacts: (facts: IFinancialFactInput[]) => Promise<number>;
  listPresentPeriods: () => Promise<Set<string>>;
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
    backfillPeriods: 0,
    backfillFacts: 0,
    failedBackfills: 0,
  };
  // Info: (20261023 - Luphia) OpenAPI 今天給的期別（年|季|市場），回補時跳過，避免兩個來源互相覆寫
  const openApiPeriods = new Set<string>();
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
      for (const fact of facts) {
        companies.add(fact.stockId);
        openApiPeriods.add(`${fact.year}|${fact.quarter}|${fact.market}`);
      }
    } catch (error) {
      summary.failedEndpoints += 1;
      logger.warn("financial facts endpoint failed", {
        url: endpoint.url,
        error: describeError(error),
      });
    }
  }
  summary.companies = companies.size;

  if (deps.shouldStop()) return summary;
  const targets = planFinancialBackfill({
    now: deps.now(),
    present: await deps.listPresentPeriods(),
    openApiPeriods,
  });
  for (const target of targets) {
    if (deps.shouldStop()) break;
    summary.backfillPeriods += 1;
    try {
      const res = await deps.http.request(MOPS_SUMMARY_URL[target.statement], {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: mopsSummaryRequestBody(target),
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const html = res.body.toString("utf8");
      // Info: (20261023 - Luphia) 被限流就停止本輪回補（不是這一期的錯），明天再來
      if (MOPS_THROTTLE_MARKERS.some((marker) => html.includes(marker))) {
        summary.failedBackfills += 1;
        logger.warn("financial backfill throttled by MOPS", {
          target: backfillKey(target),
        });
        break;
      }
      if (html.includes(MOPS_SUMMARY_EMPTY_MARKER)) continue;
      summary.backfillFacts += await deps.writeFacts(
        parseMopsSummaryHtml(html, target, deps.now()),
      );
    } catch (error) {
      summary.failedBackfills += 1;
      logger.warn("financial backfill failed", {
        target: backfillKey(target),
        error: describeError(error),
      });
    }
  }
  return summary;
}
