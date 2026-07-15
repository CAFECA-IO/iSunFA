import { promises as fs, createReadStream, type ReadStream, Stats } from "fs";
import type { FileHandle } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { ReedSolomonErasure } from "@/lib/reed_solomon_erasure";
import { logger } from "@/lib/utils/logger";

// Info: (20260715 - Emily) 真實 RS 實作已落地(見 adr_012_laria_reed_solomon.md),原模擬類別移除

// --- Info: (20251028 - Luphia) 演算法配置 (n=8, k=5) ---
export const DATA_SHARDS: number = 5;
export const PARITY_SHARDS: number = 3;
export const TOTAL_SHARDS: number = DATA_SHARDS + PARITY_SHARDS;

/**
 * Info: (20260715 - Emily) metadata 版本標記:
 * v2 = 真 Reed-Solomon parity + 全檔 sha256 校驗。
 * 無此欄位(舊檔)= parity 為零填充的模擬產物,不具還原能力,
 * 還原時必須所有資料切片到齊,缺任一即顯式失敗(舊行為是靜默回傳零填充的損毀資料)。
 */
export const LARIA_RS_VERSION: number = 2;

// Info: (20260415 - Luphia) 這裡改為最大上限值，而非絕對固定值
const MAX_SHARD_SIZE: number = 4 * 1024 * 1024; // Info: (20260415 - Luphia) 4MB 上限

// Info: (20251028 - Luphia) 實例化 Reed-Solomon 編碼器
const rse = new ReedSolomonErasure(DATA_SHARDS, PARITY_SHARDS);

const lariaLogger = logger.child({ service: "laria" });

interface ILariaMetadata {
  originalFileSize: number;
  shardSize: number;
  rsVersion?: number;
  sha256?: string;
}

// Info: (20251028 - Luphia) 檢查檔案是否存在;Info: (20260715 - Emily) 改為 Fail Fast,失敗即 throw
async function validateFileExists(filePath: string): Promise<Stats> {
  const stats: Stats = await fs.stat(filePath);
  if (!stats.isFile() || stats.size === 0) {
    throw new Error(`[Laria] 檔案不存在或是空的: ${filePath}`);
  }
  return stats;
}

/**
 * Info: (20251028 - Luphia)
 * 編碼：將任意大小的檔案切割為 8 個固定切片大小的檔案 (串流處理)
 * Info: (20260715 - Emily) parity 由真 RS 計算;metadata 加入 rsVersion 與 sha256;錯誤不再吞噬
 * @param filePath - 來源檔案路徑
 * @param outputDir - 切片存放目錄
 */
export async function encodeFile(
  filePath: string,
  outputDir: string,
): Promise<void> {
  lariaLogger.info("encode start", { filePath });

  const stats: Stats = await validateFileExists(filePath);
  const originalFileSize: number = stats.size;

  // Info: (20260415 - Gemini) 與前端同步：動態計算 Shard 大小，最大不超過 4MB
  const currentShardSize = Math.min(
    MAX_SHARD_SIZE,
    Math.max(1, Math.ceil(originalFileSize / DATA_SHARDS)),
  );
  const currentDataStripeSize = DATA_SHARDS * currentShardSize;

  // Info: (20251028 - Luphia) 建立輸出目錄
  await fs.mkdir(outputDir, { recursive: true });

  // Info: (20260715 - Emily) 全檔 sha256:還原後的完整性驗證依據(RS 只能補遺失,不能偵測內容竄改)
  const fileHash = createHash("sha256");

  // Info: (20251028 - Luphia) 建立 8 個檔案寫入句柄
  const writerHandles: FileHandle[] = await Promise.all(
    Array.from({ length: TOTAL_SHARDS }, (_, i) => {
      const shardPath = path.join(outputDir, `shard-${i + 1}.bin`);
      return fs.open(shardPath, "w");
    }),
  );

  try {
    // Info: (20260415 - Luphia) 建立檔案讀取串流，以動態計算的 Stripe Size 為準
    const readStream: ReadStream = createReadStream(filePath, {
      highWaterMark: currentDataStripeSize,
    });

    // Info: (20251028 - Luphia) 逐塊處理檔案
    for await (const chunk of readStream) {
      let dataStripe: Buffer = chunk as Buffer;
      fileHash.update(dataStripe);

      // Info: (20251028 - Luphia) 處理最後一塊 (Padding)
      if (dataStripe.length < currentDataStripeSize) {
        const paddedStripe = Buffer.alloc(currentDataStripeSize);
        dataStripe.copy(paddedStripe, 0);
        dataStripe = paddedStripe;
      }

      // Info: (20260415 - Luphia) 準備 shards 陣列，依照 currentShardSize 切割
      const shards: Buffer[] = [];
      for (let i = 0; i < DATA_SHARDS; i++) {
        shards.push(
          dataStripe.subarray(i * currentShardSize, (i + 1) * currentShardSize),
        );
      }
      for (let i = 0; i < PARITY_SHARDS; i++) {
        shards.push(Buffer.alloc(currentShardSize));
      }

      // Info: (20251028 - Luphia) 執行 Reed-Solomon 編碼 (5+3)
      await rse.encode(shards);

      // Info: (20251028 - Luphia) 將 8 個切片寫入各自的檔案
      await Promise.all(
        shards.map((shard, i) => writerHandles[i].write(shard, 0, shard.length)),
      );
    }

    // Info: (20260415 - Luphia) metadata 必須寫入 shardSize，以便恢復時使用
    const metadata: ILariaMetadata = {
      originalFileSize,
      shardSize: currentShardSize,
      rsVersion: LARIA_RS_VERSION,
      sha256: fileHash.digest("hex"),
    };
    await fs.writeFile(
      path.join(outputDir, "metadata.json"),
      JSON.stringify(metadata),
    );

    lariaLogger.info("encode done", {
      originalFileSize,
      shardSize: currentShardSize,
      totalShards: TOTAL_SHARDS,
    });
  } catch (err: unknown) {
    // Info: (20260715 - Emily) Fail Fast:編碼失敗必須讓呼叫端(uploadLaria)中止,不可產出殘缺切片
    lariaLogger.error("encode failed", {
      filePath,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    // Info: (20251028 - Luphia) 關閉所有檔案
    await Promise.all(writerHandles.map((handle) => handle.close()));
  }
}

/**
 * Info: (20251028 - Luphia)
 * 恢復：從可用的切片中恢復原始檔案 (串流處理)
 * Info: (20260715 - Emily) v2 檔以真 RS 重建遺失切片並驗 sha256;
 * 舊檔(無 rsVersion)parity 無效,資料切片缺任一即顯式失敗
 * @param shardsDir - 切片存放目錄
 * @param outputFilePath - 恢復後的檔案存放路徑
 */
export async function recoverFile(
  shardsDir: string,
  outputFilePath: string,
): Promise<void> {
  lariaLogger.info("recover start", { shardsDir });

  let originalFileSize: number;
  let currentShardSize: number;
  let rsVersion: number | undefined;
  let expectedSha256: string | undefined;

  try {
    // Info: (20251028 - Luphia) 讀取元資料
    const metaPath = path.join(shardsDir, "metadata.json");
    const metaBuffer: Buffer = await fs.readFile(metaPath);

    // Info: (20251028 - Luphia) 型別安全的解析
    const metaData: Partial<ILariaMetadata> = JSON.parse(metaBuffer.toString());

    if (typeof metaData.originalFileSize !== "number") {
      throw new Error("metadata 格式錯誤，缺少 originalFileSize");
    }

    originalFileSize = metaData.originalFileSize;
    // Info: (20260415 - Luphia) 優先讀取 metadata 的 shardSize，若無則降級為預設最大值
    currentShardSize = metaData.shardSize || MAX_SHARD_SIZE;
    rsVersion = metaData.rsVersion;
    expectedSha256 = metaData.sha256;
  } catch (err: unknown) {
    const message = `[Laria] 讀取 metadata 失敗，檔案無法恢復: ${err instanceof Error ? err.message : String(err)}`;
    lariaLogger.error("recover metadata failed", { shardsDir, error: message });
    throw new Error(message);
  }

  const isLegacy = rsVersion !== LARIA_RS_VERSION;
  if (isLegacy) {
    // Info: (20260715 - Emily) 舊檔 parity 為零填充,不具還原能力;僅能走「資料切片全到齊」路徑
    lariaLogger.warn("legacy laria file detected (no real parity)", { shardsDir });
  }

  const readerHandles: (FileHandle | null)[] = new Array(TOTAL_SHARDS).fill(
    null,
  );
  let foundShards: number = 0;
  let outputHandle: FileHandle | undefined;

  try {
    // Info: (20251028 - Luphia) 嘗試開啟所有 8 個切片的檔案存取器
    for (let i = 0; i < TOTAL_SHARDS; i++) {
      const shardPath = path.join(shardsDir, `shard-${i + 1}.bin`);
      try {
        readerHandles[i] = await fs.open(shardPath, "r");
        foundShards++;
      } catch {
        lariaLogger.warn("shard missing", { shardsDir, shardIndex: i + 1 });
      }
    }

    // Info: (20251028 - Luphia) 檢查是否滿足恢復條件 (k=5)
    if (foundShards < DATA_SHARDS) {
      throw new Error(
        `恢復失敗。需要 ${DATA_SHARDS} (5) 個切片，但只找到 ${foundShards} 個。`,
      );
    }

    // Info: (20251028 - Luphia) 開啟輸出檔案存取器
    outputHandle = await fs.open(outputFilePath, "w");

    const outputHash = createHash("sha256");
    let bytesWritten = 0;

    // Info: (20251028 - Luphia) 逐個 "Stripe" 讀取、恢復、寫入
    while (true) {
      const shards: (Buffer | null)[] = new Array(TOTAL_SHARDS).fill(null);
      const readBuffers: (Buffer | null)[] = new Array(TOTAL_SHARDS).fill(null);
      let shardsAvailableThisStripe: number = 0;
      let totalBytesReadThisStripe: number = 0;

      // Info: (20260415 - Luphia) 改用 currentShardSize 讀取每個切片
      const readPromises = readerHandles.map((handle, i) => {
        if (handle) {
          const buffer = Buffer.alloc(currentShardSize);
          readBuffers[i] = buffer;
          return handle.read(buffer, 0, currentShardSize, null);
        }
        return Promise.resolve(null);
      });

      const results = await Promise.all(readPromises);

      // Info: (20251028 - Luphia) 檢查讀取結果
      for (let i = 0; i < TOTAL_SHARDS; i++) {
        const result = results[i];
        if (result && result.bytesRead > 0) {
          if (result.bytesRead !== currentShardSize) {
            throw new Error(
              `切片 ${i + 1} 損毀: 讀取到不完整的區塊 (${result.bytesRead} / ${currentShardSize} bytes)。`,
            );
          }
          shards[i] = readBuffers[i];
          shardsAvailableThisStripe++;
          totalBytesReadThisStripe += result.bytesRead;
        }
      }

      if (totalBytesReadThisStripe === 0) {
        break;
      }

      if (shardsAvailableThisStripe < DATA_SHARDS) {
        throw new Error(`恢復中途失敗。可用的切片不足 ${DATA_SHARDS} (5) 個。`);
      }

      // Info: (20260715 - Emily) 舊檔防護:parity 是假的,遺失任何資料切片都無法重建,顯式失敗
      const missingDataShard = shards
        .slice(0, DATA_SHARDS)
        .some((shard) => shard === null);
      if (isLegacy && missingDataShard) {
        throw new Error(
          "[Laria] 舊版檔案(無真實 parity)遺失資料切片,無法恢復;請要求上傳者重新上傳。",
        );
      }

      /**
       * Info: (20260715 - Emily) 真 RS 重建:null 直接交給 reconstruct 判定遺失位置。
       * 舊實作在此先把 null 填零再呼叫,等於銷毀遺失資訊 — 已移除。
       */
      if (missingDataShard) {
        await rse.reconstruct(shards);
      }

      /**
       * Info: (20251028 - Luphia)
       * 組合原始資料 (前 k=5 個資料切片)
       */
      const dataShards: Buffer[] = shards.slice(0, DATA_SHARDS) as Buffer[];
      const dataStripe: Buffer = Buffer.concat(dataShards);

      // Info: (20260715 - Emily) sha256 以原始檔為準:最後一個 stripe 只 hash 未 padding 的部分
      const remaining = originalFileSize - bytesWritten;
      const effective = Math.min(remaining, dataStripe.length);
      if (effective > 0) {
        outputHash.update(dataStripe.subarray(0, effective));
      }
      bytesWritten += dataStripe.length;

      await outputHandle.write(dataStripe);
    }

    // Info: (20251028 - Luphia) 裁剪檔案至原始大小
    await outputHandle.truncate(originalFileSize);

    // Info: (20260715 - Emily) v2 完整性驗證:hash 不符即 throw,絕不回傳可疑內容
    if (expectedSha256) {
      const actualSha256 = outputHash.digest("hex");
      if (actualSha256 !== expectedSha256) {
        throw new Error(
          `[Laria] 完整性驗證失敗:sha256 不符(expected ${expectedSha256}, got ${actualSha256})。`,
        );
      }
    }

    lariaLogger.info("recover done", {
      originalFileSize,
      foundShards,
      verified: Boolean(expectedSha256),
    });
  } catch (err: unknown) {
    const errMsg = `[恢復] 處理失敗: ${err instanceof Error ? err.message : String(err)}`;
    lariaLogger.error("recover failed", { shardsDir, error: errMsg });
    throw new Error(errMsg);
  } finally {
    // Info: (20251028 - Luphia) 關閉所有檔案句柄
    if (outputHandle) await outputHandle.close();
    await Promise.all(readerHandles.map((handle) => handle && handle.close()));
  }
}
