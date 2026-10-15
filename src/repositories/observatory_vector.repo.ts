import { lanceDBService } from "@/services/lancedb.service";
import {
  OBSERVATORY_EMBED_DIMENSION,
  OBSERVATORY_LANCE_TABLE,
  OBSERVATORY_SNAPSHOT_SOURCES,
} from "@/constants/company_observatory";
import {
  IObservatoryVectorFilter,
  IObservatoryVectorRow,
} from "@/interfaces/company_observatory";
import { ObservatoryInfraUnavailableError } from "@/lib/company_observatory/errors";
import { vectorDimensionOf } from "@/lib/company_observatory/lance_schema";

/**
 * Info: (20261015 - Luphia) 企業觀測站的向量儲存（LanceDB `company_observatory_chunks`）。
 *
 * 寫入以文件為單位「先刪後寫」：同一份文件重新索引時舊切塊整批移除，
 * 列 id 又是 `{documentId}_{chunkIndex}` 的決定性組合，重跑不會留下重複列。
 *
 * 檢索分兩路：向量（語意）與全文（`text` 欄位上的二元組 BM25 索引，由 scripts/init_lance_db.ts 建立），
 * 兩路共用同一組過濾條件，合併交給呼叫端（見 rank_fusion.ts）。
 */

export type IObservatoryScoredRow = IObservatoryVectorRow & {
  _distance?: number;
  _score?: number;
};

// Info: (20261015 - Luphia) 過濾式的值都已經過 Schema（股票代號英數、來源列舉、年度整數），這裡再擋一次單引號
function quote(value: string): string {
  if (!/^[0-9A-Za-z_-]+$/.test(value)) {
    throw new Error(`unsafe LanceDB filter value: ${value}`);
  }
  return `'${value}'`;
}

export function buildObservatoryWhere(
  filter: IObservatoryVectorFilter,
): string | null {
  const clauses: string[] = [];
  const inList = (column: string, values: string[]) =>
    clauses.push(`${column} IN (${values.map(quote).join(", ")})`);
  if (filter.stockIds && filter.stockIds.length > 0) {
    inList("stock_id", filter.stockIds);
  }
  if (filter.sources && filter.sources.length > 0) {
    inList("source", [...filter.sources]);
  }
  if (filter.years && filter.years.length > 0) {
    if (!filter.years.every((year) => Number.isInteger(year))) {
      throw new Error("year must be integer");
    }
    // Info: (20261015 - Luphia) 快照型來源的 year 不是報告年度，年度過濾不套用在它們身上
    clauses.push(
      `(year IN (${filter.years.join(", ")}) OR source IN (${OBSERVATORY_SNAPSHOT_SOURCES.map(quote).join(", ")}))`,
    );
  }
  return clauses.length > 0 ? clauses.join(" AND ") : null;
}

async function openTable() {
  try {
    return await lanceDBService.getTable(OBSERVATORY_LANCE_TABLE);
  } catch (error) {
    throw new ObservatoryInfraUnavailableError(
      `LanceDB table ${OBSERVATORY_LANCE_TABLE} unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export const observatoryVectorRepo = {
  async replaceDocumentChunks(
    documentId: string,
    rows: IObservatoryVectorRow[],
  ): Promise<void> {
    const table = await openTable();
    /**
     * Info: (20261015 - Luphia) 換了嵌入模型但資料表還沒重建（scripts/reindex_lance_db.ts）時，
     * 維度對不上的向量寫不進去。視為基礎設施不可用：索引暫停、不計文件失敗次數，
     * 免得整批文件因為部署步驟還沒做完就被打進死信。
     */
    const dimension = vectorDimensionOf(await table.schema());
    if (dimension !== OBSERVATORY_EMBED_DIMENSION) {
      throw new ObservatoryInfraUnavailableError(
        `LanceDB table ${OBSERVATORY_LANCE_TABLE} has vector dimension ${dimension}, expected ${OBSERVATORY_EMBED_DIMENSION}; run scripts/reindex_lance_db.ts`,
      );
    }
    await table.delete(`document_id = ${quote(documentId)}`);
    if (rows.length > 0) await table.add(rows);
  },

  async search(params: {
    vector: number[];
    filter: IObservatoryVectorFilter;
    limit: number;
  }): Promise<IObservatoryScoredRow[]> {
    const table = await openTable();
    let query = table.vectorSearch(params.vector).limit(params.limit);
    const where = buildObservatoryWhere(params.filter);
    if (where) query = query.where(where);
    return (await query.toArray()) as IObservatoryScoredRow[];
  },

  // Info: (20261015 - Luphia) 全文檢索（BM25）；尚未建索引的新列 LanceDB 會以掃描補上，結果仍完整
  async searchText(params: {
    query: string;
    filter: IObservatoryVectorFilter;
    limit: number;
  }): Promise<IObservatoryScoredRow[]> {
    const table = await openTable();
    let query = table.search(params.query, "fts", "text").limit(params.limit);
    const where = buildObservatoryWhere(params.filter);
    if (where) query = query.where(where);
    return (await query.toArray()) as IObservatoryScoredRow[];
  },

  // Info: (20261015 - Luphia) 合併小檔並把新寫入的列併進向量／全文索引，讓檢索不必一直掃描未索引的尾巴
  async optimize(): Promise<void> {
    const table = await openTable();
    await table.optimize();
  },
};
