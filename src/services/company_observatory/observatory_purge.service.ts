import { OBSERVATORY_REPORT_PATH_PREFIX } from "@/constants/company_observatory";

/**
 * Info: (20261028 - Luphia) 清空企業觀測站收集的資料（scripts/purge_company_observatory.ts）。
 *
 * 清的是觀測站自己下載與產生的東西：下載狀態、原始檔、向量切塊、發布到企業觀測站頁面的報告、財務數字。
 * 不碰公司字典 `Company`（其他功能也在用）、手動匯入的報告與 `pdfs/`、計費紀錄。
 *
 * 開關開著時拒絕清空：worker 下一輪就會重新規劃、重新下載，清了等於白清。
 * 順序是先刪下載狀態（worker 沒有東西可處理）→ 發布的報告 → 財務數字 → 向量切塊 → 原始檔；
 * 每一步都可重跑，中途失敗再執行一次即可。
 */

export interface IObservatoryPurgeCounts {
  documents: number;
  reports: number;
  financialFacts: number;
  chunks: number;
  files: number;
  bytes: number;
}

export interface IObservatoryPurgeDeps {
  isEnabled: () => Promise<boolean>;
  documents: { countAll(): Promise<number>; deleteAll(): Promise<number> };
  reports: {
    countByPdfPathPrefix(prefix: string): Promise<number>;
    deleteByPdfPathPrefix(prefix: string): Promise<number>;
  };
  financialFacts: { countAll(): Promise<number>; deleteAll(): Promise<number> };
  chunks: { countRows(): Promise<number>; clear(): Promise<void> };
  files: {
    inspect(): Promise<{ files: number; bytes: number }>;
    remove(): Promise<void>;
  };
}

export class ObservatoryPurgeRefusedError extends Error {}

// Info: (20261028 - Luphia) 發布到 Report 的觀測站報告都以 `observatory/` 開頭；手動匯入的是 pdfs/ 下的檔名
const REPORT_PREFIX = `${OBSERVATORY_REPORT_PATH_PREFIX}/`;

export function createObservatoryPurgeService(deps: IObservatoryPurgeDeps) {
  async function inspect(): Promise<IObservatoryPurgeCounts> {
    const [documents, reports, financialFacts, chunks, storage] =
      await Promise.all([
        deps.documents.countAll(),
        deps.reports.countByPdfPathPrefix(REPORT_PREFIX),
        deps.financialFacts.countAll(),
        deps.chunks.countRows(),
        deps.files.inspect(),
      ]);
    return {
      documents,
      reports,
      financialFacts,
      chunks,
      files: storage.files,
      bytes: storage.bytes,
    };
  }

  async function purge(): Promise<IObservatoryPurgeCounts> {
    if (await deps.isEnabled()) {
      throw new ObservatoryPurgeRefusedError(
        "business monitor is enabled; turn BUSINESS_MONITOR_ENABLED off first or the worker will download everything again",
      );
    }
    const before = await inspect();
    await deps.documents.deleteAll();
    await deps.reports.deleteByPdfPathPrefix(REPORT_PREFIX);
    await deps.financialFacts.deleteAll();
    await deps.chunks.clear();
    await deps.files.remove();
    return before;
  }

  return { inspect, purge };
}
