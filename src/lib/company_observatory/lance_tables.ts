import * as lancedb from "@lancedb/lancedb";
import {
  OBSERVATORY_EMBED_DIMENSION,
  OBSERVATORY_FTS_NGRAM_LENGTH,
  OBSERVATORY_LANCE_TABLE,
} from "@/constants/company_observatory";
import { vectorDimensionOf } from "@/lib/company_observatory/lance_schema";

/**
 * Info: (20261015 - Luphia) LanceDB 兩張切塊表的建立、檢查與重建（scripts/init_lance_db.ts、
 * scripts/reindex_lance_db.ts 共用）。
 *
 * - `company_reports`：手動匯入（scripts/import_pdfs.ts）的切塊，欄位沿用 Julian 的設計。
 * - `company_observatory_chunks`：企業觀測站 worker 的切塊（欄位見 IObservatoryVectorRow），
 *   另在 `text` 上建全文索引供混合檢索。
 *
 * 兩張表的向量維度都跟著 OBSERVATORY_EMBED_DIMENSION；換嵌入模型後舊表的維度對不上，必須重建。
 */

export const LEGACY_LANCE_TABLE = "company_reports";
const SEED_ID = "seed-id";

export interface ILanceTableStatus {
  name: string;
  exists: boolean;
  dimension: number | null;
  // Info: (20261015 - Luphia) 表存在但維度與目前的嵌入模型不同 → 需要重建
  needsRebuild: boolean;
}

function observatorySeed() {
  return {
    id: SEED_ID,
    vector: new Float32Array(OBSERVATORY_EMBED_DIMENSION),
    text: "DATABASE_SCHEMA_SEED",
    document_id: "seed",
    stock_id: "seed",
    company_name: "SEED",
    source: "seed",
    year: 0,
    source_url: "",
    page_number: 0,
    chunk_index: 0,
    content_hash: "",
  };
}

function legacySeed() {
  return {
    id: SEED_ID,
    vector: new Float32Array(OBSERVATORY_EMBED_DIMENSION),
    text: "DATABASE_SCHEMA_SEED",
    reportId: "seed",
    companyName: "SEED",
    pageNumber: 0,
  };
}

const SEEDS: Record<string, () => Record<string, unknown>> = {
  [LEGACY_LANCE_TABLE]: legacySeed,
  [OBSERVATORY_LANCE_TABLE]: observatorySeed,
};

export const MANAGED_LANCE_TABLES: readonly string[] = Object.keys(SEEDS);

export async function inspectLanceTable(
  db: lancedb.Connection,
  name: string,
): Promise<ILanceTableStatus> {
  const names = await db.tableNames();
  if (!names.includes(name)) {
    return { name, exists: false, dimension: null, needsRebuild: false };
  }
  /**
   * Info: (20261015 - Luphia) 資料夾在但打不開（例如 `_versions` 遺失的殘缺表）也算需要重建，
   * 不讓 init_lance_db 因為一張壞表整個失敗、擋住 npm run dev。
   */
  let dimension: number | null;
  try {
    const table = await db.openTable(name);
    dimension = vectorDimensionOf(await table.schema());
  } catch {
    dimension = null;
  }
  return {
    name,
    exists: true,
    dimension,
    needsRebuild: dimension !== OBSERVATORY_EMBED_DIMENSION,
  };
}

/**
 * Info: (20261015 - Luphia) 企業觀測站表的全文索引：字元二元組、不做詞幹與停用詞（中文用不到，
 * 英文縮寫如 ESG、CO2e 也該照字面比對）。已存在就跳過，重跑安全。
 */
export async function ensureObservatoryFtsIndex(
  table: lancedb.Table,
): Promise<boolean> {
  const indices = await table.listIndices();
  if (indices.some((index) => index.columns.includes("text"))) return false;
  await table.createIndex("text", {
    config: lancedb.Index.fts({
      baseTokenizer: "ngram",
      ngramMinLength: OBSERVATORY_FTS_NGRAM_LENGTH,
      ngramMaxLength: OBSERVATORY_FTS_NGRAM_LENGTH,
      lowercase: true,
      stem: false,
      removeStopWords: false,
      asciiFolding: false,
    }),
  });
  return true;
}

/**
 * Info: (20261015 - Luphia) 以目前的維度建立空表（`overwrite` 會丟掉同名舊表的全部切塊）。
 * LanceDB 建表需要至少一筆資料推斷欄位型別，所以先放一筆種子再刪掉。
 */
export async function createLanceTable(
  db: lancedb.Connection,
  name: string,
  mode: "create" | "overwrite",
): Promise<lancedb.Table> {
  const seed = SEEDS[name];
  if (!seed) throw new Error(`unmanaged LanceDB table ${name}`);
  const table = await db.createTable(name, [seed()], { mode });
  await table.delete(`id = '${SEED_ID}'`);
  if (name === OBSERVATORY_LANCE_TABLE) await ensureObservatoryFtsIndex(table);
  return table;
}
