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
