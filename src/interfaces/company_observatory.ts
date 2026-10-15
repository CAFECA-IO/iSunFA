import {
  OBSERVATORY_FETCH_OUTCOME,
  ObservatoryContentType,
  ObservatoryDocumentStatus,
  ObservatorySource,
} from "@/constants/company_observatory";

/**
 * Info: (20261015 - Luphia) 企業觀測站的型別。常數與狀態流見 `@/constants/company_observatory`。
 */

// Info: (20261015 - Luphia) 一次下載的目標：哪家公司、哪個年度（公司資料取自唯讀的 Company 字典）
export interface IObservatoryTarget {
  stockId: string;
  companyName: string;
  marketType: string;
  taxId: string | null;
  year: number;
}

export interface IObservatoryFetchFound {
  outcome: typeof OBSERVATORY_FETCH_OUTCOME.FOUND;
  sourceUrl: string;
  title: string;
  contentType: ObservatoryContentType;
  body: Buffer;
}

export interface IObservatoryFetchNotAvailable {
  outcome: typeof OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE;
  reason: string;
  sourceUrl: string | null;
}

export type IObservatoryFetchResult =
  | IObservatoryFetchFound
  | IObservatoryFetchNotAvailable;

export interface IObservatoryHttpRequest {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

export interface IObservatoryHttpResponse {
  status: number;
  body: Buffer;
}

// Info: (20261015 - Luphia) 下載器只透過這個介面連外，測試以 fixture 實作即可不碰網路
export interface IObservatoryHttpClient {
  request(
    url: string,
    init?: IObservatoryHttpRequest,
  ): Promise<IObservatoryHttpResponse>;
}

export interface IObservatoryDownloader {
  source: ObservatorySource;
  fetch(
    target: IObservatoryTarget,
    http: IObservatoryHttpClient,
  ): Promise<IObservatoryFetchResult>;
}

// Info: (20261015 - Luphia) 嵌入向量產生器；測試注入假的實作
export interface IObservatoryEmbedder {
  embed(text: string): Promise<number[]>;
}

export interface IObservatoryChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
}

/**
 * Info: (20261015 - Luphia) LanceDB `company_observatory_chunks` 的一列。
 * 欄位用 snake_case：LanceDB 的過濾式對大寫欄位名要另外加反引號，統一小寫省掉這個陷阱。
 */
export interface IObservatoryVectorRow {
  [key: string]: unknown;
  id: string;
  vector: number[];
  text: string;
  document_id: string;
  stock_id: string;
  company_name: string;
  source: ObservatorySource;
  year: number;
  source_url: string;
  page_number: number;
  chunk_index: number;
  content_hash: string;
}

export interface IObservatoryVectorFilter {
  stockId?: string;
  source?: ObservatorySource;
  year?: number;
}

export interface IObservatorySearchHit {
  documentId: string;
  stockId: string;
  companyName: string;
  source: ObservatorySource;
  year: number;
  sourceUrl: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  distance: number | null;
}

export interface IObservatoryDocumentView {
  id: string;
  stockId: string;
  source: string;
  year: number;
  status: string;
  title: string | null;
  sourceUrl: string | null;
  chunkCount: number;
  attemptCount: number;
  lastError: string | null;
  nextAttemptAt: string;
  downloadedAt: string | null;
  indexedAt: string | null;
  updatedAt: string;
}

export interface IObservatoryStatusCount {
  source: string;
  status: string;
  count: number;
}

export interface IObservatoryOverview {
  counts: IObservatoryStatusCount[];
  documents: IObservatoryDocumentView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IObservatoryListQuery {
  stockId?: string;
  source?: ObservatorySource;
  status?: ObservatoryDocumentStatus;
  year?: number;
  page: number;
  pageSize: number;
}

export interface IObservatoryProcessSummary {
  attempted: number;
  downloaded: number;
  unchanged: number;
  notAvailable: number;
  failed: number;
  dead: number;
  throttledSources: ObservatorySource[];
}

export interface IObservatoryIndexSummary {
  attempted: number;
  indexed: number;
  failed: number;
  dead: number;
  skippedReason: string | null;
}
