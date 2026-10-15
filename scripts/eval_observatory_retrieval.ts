import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import {
  OBSERVATORY_DOCUMENT_STATUS,
  OBSERVATORY_EMBED_MODEL,
  OBSERVATORY_LIST_MAX_PAGE_SIZE,
  OBSERVATORY_SEARCH_MODE,
  OBSERVATORY_SOURCES,
  ObservatorySearchMode,
  ObservatorySource,
} from "@/constants/company_observatory";
import { IObservatorySearchHit } from "@/interfaces/company_observatory";
import {
  buildObservatoryFilter,
  detectQuestionYears,
} from "@/lib/company_observatory/business_monitor_bridge";
import { createOllamaEmbedder } from "@/lib/company_observatory/embedder";
import { observatoryDocumentRepo } from "@/repositories/observatory_document.repo";
import { observatoryVectorRepo } from "@/repositories/observatory_vector.repo";
import { searchObservatoryChunks } from "@/services/company_observatory/company_observatory.indexer.service";

dotenv.config();

/**
 * Info: (20261015 - Luphia) 企業觀測站檢索評估。
 * Command: npx tsx scripts/eval_observatory_retrieval.ts [--mode hybrid|dense|lexical] [--no-year-filter]
 *
 * 用本機已索引的切塊（LANCEDB_URI）跑 scripts/fixtures/observatory_retrieval_eval_cases.json 的題組，
 * 與 AI 諮詢「問題裡有公司名稱」時同一套過濾條件（buildObservatoryFilter：限公司代號，問到的年度有報告時
 * 再限年度；需要資料庫裡該公司已索引的 ObservatoryDocument），比較正確切塊排在第幾名。
 * `--no-year-filter` 只限公司，可與舊行為比較。
 * AI 諮詢只取前 3 名（LANCE_DB_CHAT_LIMIT），所以 hit@3 是最直接的指標；MRR@10 看整體名次。
 *
 * 正確與否由題組裡的「來源 + 年度 + 必含字串」決定，不經 LLM，結果是決定性的；
 * 換嵌入模型、改切塊或改融合參數後重跑，就能和上一次的數字直接比較。
 */

// Info: (20261015 - Luphia) 以專案根目錄為準（與 npm scripts 相同，從 repo 根目錄執行）
const CASES_PATH = path.join(
  process.cwd(),
  "scripts",
  "fixtures",
  "observatory_retrieval_eval_cases.json",
);
const MODE_FLAG = "--mode";
const NO_YEAR_FILTER_FLAG = "--no-year-filter";
const RANK_DEPTH = 10;
const HIT_CUTOFFS = [1, 3, 5] as const;

const relevantSchema = z.object({
  source: z.string().optional(),
  year: z.number().int().optional(),
  mustContain: z.array(z.string().min(1)).min(1),
});
const casesSchema = z.object({
  stockId: z.string().regex(/^[0-9A-Za-z]+$/),
  cases: z.array(
    z.object({
      id: z.string(),
      question: z.string().min(1),
      relevant: z.array(relevantSchema).min(1),
    }),
  ),
});

type IRelevant = z.infer<typeof relevantSchema>;

function isRelevant(hit: IObservatorySearchHit, relevant: IRelevant[]) {
  return relevant.some(
    (r) =>
      (r.source === undefined || r.source === hit.source) &&
      (r.year === undefined || r.year === hit.year) &&
      r.mustContain.every((needle) => hit.text.includes(needle)),
  );
}

function parseMode(argv: string[]): ObservatorySearchMode {
  const index = argv.indexOf(MODE_FLAG);
  if (index === -1) return OBSERVATORY_SEARCH_MODE.HYBRID;
  const value = argv[index + 1];
  const modes: readonly string[] = Object.values(OBSERVATORY_SEARCH_MODE);
  if (!value || !modes.includes(value)) {
    throw new Error(`${MODE_FLAG} must be one of ${modes.join(", ")}`);
  }
  return value as ObservatorySearchMode;
}

function isObservatorySource(value: string): value is ObservatorySource {
  return (OBSERVATORY_SOURCES as readonly string[]).includes(value);
}

async function main() {
  const mode = parseMode(process.argv);
  const yearFilter = !process.argv.includes(NO_YEAR_FILTER_FLAG);
  const suite = casesSchema.parse(
    JSON.parse(fs.readFileSync(CASES_PATH, "utf-8")),
  );
  const deps = {
    embedder: createOllamaEmbedder(),
    vectors: observatoryVectorRepo,
  };
  const { rows: indexed } = await observatoryDocumentRepo.list({
    stockId: suite.stockId,
    status: OBSERVATORY_DOCUMENT_STATUS.INDEXED,
    page: 1,
    pageSize: OBSERVATORY_LIST_MAX_PAGE_SIZE,
  });
  const paths = indexed.flatMap((doc) =>
    isObservatorySource(doc.source)
      ? [{ stockId: doc.stockId, year: doc.year, source: doc.source }]
      : [],
  );
  if (paths.length === 0) {
    throw new Error(`no indexed observatory documents for ${suite.stockId}`);
  }
  console.log(
    `🔎 [Eval] 模型 ${OBSERVATORY_EMBED_MODEL}，檢索方式 ${mode}，年度過濾 ${yearFilter ? "開" : "關"}，` +
      `${suite.cases.length} 題（公司 ${suite.stockId}，已索引 ${paths.length} 份文件）`,
  );

  const hits = new Map<number, number>(HIT_CUTOFFS.map((k) => [k, 0]));
  let reciprocalRankSum = 0;
  for (const testCase of suite.cases) {
    const results = await searchObservatoryChunks(deps, {
      query: testCase.question,
      filter: buildObservatoryFilter(
        true,
        paths,
        [],
        yearFilter ? detectQuestionYears(testCase.question) : [],
      ),
      limit: RANK_DEPTH,
      mode,
    });
    const rank =
      results.findIndex((hit) => isRelevant(hit, testCase.relevant)) + 1;
    for (const k of HIT_CUTOFFS) {
      if (rank > 0 && rank <= k) hits.set(k, (hits.get(k) ?? 0) + 1);
    }
    if (rank > 0) reciprocalRankSum += 1 / rank;
    const top = results[0];
    console.log(
      `${rank > 0 && rank <= 3 ? "✅" : "❌"} ${testCase.id.padEnd(30)} 名次 ${rank > 0 ? rank : `>${RANK_DEPTH}`}` +
        `｜第 1 名：${top ? `${top.source} ${top.year} p.${top.pageNumber}` : "（無結果）"}`,
    );
  }

  const total = suite.cases.length;
  const summary = HIT_CUTOFFS.map(
    (k) => `hit@${k} ${hits.get(k)}/${total}`,
  ).join("  ");
  console.log(
    `\n📊 [Eval] ${summary}  MRR@${RANK_DEPTH} ${(reciprocalRankSum / total).toFixed(3)}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ [Eval] 執行失敗:", error);
    process.exit(1);
  });
