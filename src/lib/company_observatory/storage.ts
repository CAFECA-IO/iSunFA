import fs from "node:fs/promises";
import path from "node:path";
import {
  OBSERVATORY_CONTENT_TYPE,
  OBSERVATORY_STORAGE_DIR,
  ObservatoryContentType,
  ObservatorySource,
} from "@/constants/company_observatory";

/**
 * Info: (20261015 - Luphia) 企業觀測站原始檔的本機存放（`data/company_observatory/`，已在 .gitignore）。
 * DB 只記相對路徑，搬動根目錄不必改資料。寫入走「暫存檔 → rename」，中斷時不會留下半個檔案被當成完成。
 */
export interface IObservatoryStorage {
  save(relativePath: string, body: Buffer): Promise<void>;
  read(relativePath: string): Promise<Buffer>;
}

export function observatoryFilePath(params: {
  stockId: string;
  year: number;
  source: ObservatorySource;
  contentType: ObservatoryContentType;
}): string {
  const ext =
    params.contentType === OBSERVATORY_CONTENT_TYPE.PDF ? "pdf" : "txt";
  return path.posix.join(
    params.stockId,
    String(params.year),
    `${params.source}.${ext}`,
  );
}

export function createFileStorage(
  root: string = OBSERVATORY_STORAGE_DIR,
): IObservatoryStorage {
  const resolve = (relativePath: string) => {
    const absolute = path.resolve(root, relativePath);
    if (!absolute.startsWith(path.resolve(root) + path.sep)) {
      throw new Error(`path escapes storage root: ${relativePath}`);
    }
    return absolute;
  };
  return {
    async save(relativePath: string, body: Buffer): Promise<void> {
      const absolute = resolve(relativePath);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      const temp = `${absolute}.${process.pid}.tmp`;
      await fs.writeFile(temp, body);
      await fs.rename(temp, absolute);
    },
    read(relativePath: string): Promise<Buffer> {
      return fs.readFile(resolve(relativePath));
    },
  };
}

/**
 * Info: (20261028 - Luphia) 清空企業觀測站的原始檔（scripts/purge_company_observatory.ts）。
 *
 * 只接受 OBSERVATORY_STORAGE_DIR 本身：這是整個資料夾的遞迴刪除，參數若被改成別的路徑（例如 data/），
 * 會把不屬於觀測站的東西一起刪掉。不是那個資料夾就直接丟錯，不嘗試。
 */
function assertObservatoryRoot(root: string): string {
  const resolved = path.resolve(root);
  if (resolved !== path.resolve(OBSERVATORY_STORAGE_DIR)) {
    throw new Error(`refusing to touch a non-observatory folder: ${resolved}`);
  }
  return resolved;
}

export async function inspectStorageRoot(
  root: string = OBSERVATORY_STORAGE_DIR,
): Promise<{ files: number; bytes: number }> {
  const resolved = assertObservatoryRoot(root);
  let files = 0;
  let bytes = 0;
  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        files += 1;
        bytes += (await fs.stat(full)).size;
      }
    }
  };
  try {
    await walk(resolved);
  } catch (error) {
    // Info: (20261028 - Luphia) 資料夾不存在＝從未下載過，沒有東西要清
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return { files, bytes };
}

export async function removeStorageRoot(
  root: string = OBSERVATORY_STORAGE_DIR,
): Promise<void> {
  await fs.rm(assertObservatoryRoot(root), { recursive: true, force: true });
}
