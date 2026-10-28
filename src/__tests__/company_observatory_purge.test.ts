import { describe, it, expect } from "@jest/globals";
import path from "path";
import {
  createObservatoryPurgeService,
  IObservatoryPurgeDeps,
  ObservatoryPurgeRefusedError,
} from "@/services/company_observatory/observatory_purge.service";
import {
  inspectStorageRoot,
  removeStorageRoot,
} from "@/lib/company_observatory/storage";

/**
 * Info: (20261028 - Luphia) 清空企業觀測站（npm run purge_company_observatory）。
 * 刪除無法復原，所以釘住三件事：開關開著時拒絕、只刪觀測站自己的報告（observatory/ 前綴）、
 * 檔案刪除只認觀測站資料夾本身。
 */

function fakeDeps(enabled: boolean) {
  const calls: string[] = [];
  const deps: IObservatoryPurgeDeps = {
    isEnabled: async () => enabled,
    documents: {
      countAll: async () => 10,
      deleteAll: async () => {
        calls.push("documents");
        return 10;
      },
    },
    reports: {
      countByPdfPathPrefix: async () => 7,
      deleteByPdfPathPrefix: async (prefix) => {
        calls.push(`reports:${prefix}`);
        return 7;
      },
    },
    financialFacts: {
      countAll: async () => 1000,
      deleteAll: async () => {
        calls.push("financialFacts");
        return 1000;
      },
    },
    chunks: {
      countRows: async () => 300,
      clear: async () => {
        calls.push("chunks");
      },
    },
    files: {
      inspect: async () => ({ files: 9, bytes: 1024 }),
      remove: async () => {
        calls.push("files");
      },
    },
  };
  return { deps, calls };
}

describe("observatory purge", () => {
  it("only counts in a dry run", async () => {
    const { deps, calls } = fakeDeps(false);
    expect(await createObservatoryPurgeService(deps).inspect()).toEqual({
      documents: 10,
      reports: 7,
      financialFacts: 1000,
      chunks: 300,
      files: 9,
      bytes: 1024,
    });
    expect(calls).toEqual([]);
  });

  it("refuses while the business monitor is enabled", async () => {
    const { deps, calls } = fakeDeps(true);
    await expect(createObservatoryPurgeService(deps).purge()).rejects.toThrow(
      ObservatoryPurgeRefusedError,
    );
    expect(calls).toEqual([]);
  });

  it("removes download state first and only observatory reports", async () => {
    const { deps, calls } = fakeDeps(false);
    const removed = await createObservatoryPurgeService(deps).purge();
    expect(calls).toEqual([
      "documents",
      "reports:observatory/",
      "financialFacts",
      "chunks",
      "files",
    ]);
    expect(removed.documents).toBe(10);
  });
});

describe("observatory storage purge guard", () => {
  it("refuses to inspect or delete any folder but the observatory's", async () => {
    const dataDir = path.join(process.cwd(), "data");
    await expect(inspectStorageRoot(dataDir)).rejects.toThrow(
      "non-observatory",
    );
    await expect(removeStorageRoot(dataDir)).rejects.toThrow("non-observatory");
    await expect(
      removeStorageRoot(
        path.join(process.cwd(), "data", "company_observatory", ".."),
      ),
    ).rejects.toThrow("non-observatory");
  });
});
