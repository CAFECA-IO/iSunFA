import { lanceDBService } from "@/services/lancedb.service";
import { OBSERVATORY_LANCE_TABLE } from "@/constants/company_observatory";
import {
  IObservatoryVectorFilter,
  IObservatoryVectorRow,
} from "@/interfaces/company_observatory";
import { ObservatoryInfraUnavailableError } from "@/lib/company_observatory/errors";

/**
 * Info: (20261015 - Luphia) 企業觀測站的向量儲存（LanceDB `company_observatory_chunks`）。
 *
 * 寫入以文件為單位「先刪後寫」：同一份文件重新索引時舊切塊整批移除，
 * 列 id 又是 `{documentId}_{chunkIndex}` 的決定性組合，重跑不會留下重複列。
 */

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
  if (filter.stockId) clauses.push(`stock_id = ${quote(filter.stockId)}`);
  if (filter.source) clauses.push(`source = ${quote(filter.source)}`);
  if (filter.year !== undefined) {
    if (!Number.isInteger(filter.year)) throw new Error("year must be integer");
    clauses.push(`year = ${filter.year}`);
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
    await table.delete(`document_id = ${quote(documentId)}`);
    if (rows.length > 0) await table.add(rows);
  },

  async search(params: {
    vector: number[];
    filter: IObservatoryVectorFilter;
    limit: number;
  }): Promise<(IObservatoryVectorRow & { _distance?: number })[]> {
    const table = await openTable();
    let query = table.vectorSearch(params.vector).limit(params.limit);
    const where = buildObservatoryWhere(params.filter);
    if (where) query = query.where(where);
    return (await query.toArray()) as (IObservatoryVectorRow & {
      _distance?: number;
    })[];
  },
};
