import { promises as fs, createReadStream, type ReadStream, Stats } from "fs";
import type { FileHandle } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { ReedSolomonErasure } from "@/lib/reed_solomon_erasure";
import { logger } from "@/lib/utils/logger";

// Info: (20260715 - Emily) Reed-Solomon 選型與數學性質見 adr_012_laria_reed_solomon.md

// Info: (20251028 - Luphia) 演算法配置（n=8, k=5）
export const DATA_SHARDS: number = 5;
export const PARITY_SHARDS: number = 3;
export const TOTAL_SHARDS: number = DATA_SHARDS + PARITY_SHARDS;

/**
 * Info: (20260715 - Emily) metadata 版本標記
 * parity 由 Reed-Solomon 計算，並含全檔 sha256，可重建遺失切片並驗證完整性
 * 若 metadata 無法解析或無 rsVersion 欄位，視為舊版（parity 為零填充，不具還原能力）
 * 舊版還原需所有資料切片到齊，缺任一即失敗
 */
export const LARIA_RS_VERSION: number = 2;

// Info: (20260415 - Luphia) 切片大小的上限，實際 shardSize 依檔案大小動態計算，不超過此值
const MAX_SHARD_SIZE: number = 4 * 1024 * 1024; // Info: (20260415 - Luphia) 4MB

// Info: (20251028 - Luphia) 實例化 Reed-Solomon 編碼器
const rse = new ReedSolomonErasure(DATA_SHARDS, PARITY_SHARDS);

const lariaLogger = logger.child({ service: "laria" });

interface ILariaMetadata {
  originalFileSize: number;
  shardSize: number;
  rsVersion?: number;
  sha256?: string;
}

// Info: (20251028 - Luphia) 檢查檔案是否存在，失敗即 throw
async function validateFileExists(filePath: string): Promise<Stats> {
  const stats: Stats = await fs.stat(filePath);
  if (!stats.isFile() || stats.size === 0) {
    throw new Error(`[Laria] 檔案不存在或是空的: ${filePath}`);
  }
  return stats;
}

/**
 * Info: (20251028 - Luphia) 以串流將檔案切為 5 個資料切片 + 3 個 parity 切片（共 8 檔）
 * parity 由 Reed-Solomon 計算，並寫入 metadata（originalFileSize、shardSize、rsVersion、sha256）
 * 編碼失敗會拋錯，呼叫端須中止，不會留下可用的殘缺切片
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

  // Info: (20260715 - Emily) 全檔 sha256，還原後的完整性驗證依據（RS 只能補遺失，不能偵測內容竄改）
  const fileHash = createHash("sha256");

  // Info: (20260716 - Luphia) 建立 8 個檔案寫入句柄，採 allSettled，任一開檔失敗時關閉已開句柄再拋錯，避免洩漏
  const openResults = await Promise.allSettled(
    Array.from({ length: TOTAL_SHARDS }, (_, i) =>
      fs.open(path.join(outputDir, `shard-${i + 1}.bin`), "w"),
    ),
  );
  const writerHandles: FileHandle[] = openResults
    .filter(
      (r): r is PromiseFulfilledResult<FileHandle> => r.status === "fulfilled",
    )
    .map((r) => r.value);
  const openFailure = openResults.find((r) => r.status === "rejected");
  if (openFailure) {
    await Promise.all(writerHandles.map((handle) => handle.close()));
    const reason = (openFailure as PromiseRejectedResult).reason;
    throw reason instanceof Error ? reason : new Error(String(reason));
  }

  try {
    // Info: (20251028 - Luphia) 將一個完整 Stripe（長度必為 currentDataStripeSize）編碼並寫入 8 個切片檔
    const processStripe = async (dataStripe: Buffer): Promise<void> => {
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
        shards.map((shard, i) =>
          writerHandles[i].write(shard, 0, shard.length),
        ),
      );
    };

    // Info: (20260415 - Luphia) 建立檔案讀取串流，以動態計算的 Stripe Size 為準
    const readStream: ReadStream = createReadStream(filePath, {
      highWaterMark: currentDataStripeSize,
    });

    /**
     * Info: (20260716 - Luphia)
     * highWaterMark 只是緩衝上限，單一 chunk 不保證等於 currentDataStripeSize，
     * 故以 pending 緩衝累積，湊滿一個完整 stripe 才編碼，
     * 僅檔案結尾的殘塊才補零，避免在資料中段誤植零填充造成編碼錯位。
     */
    let pending: Buffer = Buffer.alloc(0);
    for await (const chunk of readStream) {
      const chunkBuf: Buffer = chunk as Buffer;
      // Info: (20260716 - Luphia) 全檔 sha256 逐塊累加，與 stripe 切割邊界無關
      fileHash.update(chunkBuf);
      pending =
        pending.length === 0 ? chunkBuf : Buffer.concat([pending, chunkBuf]);

      // Info: (20260716 - Luphia) 排出所有已湊滿的完整 stripe
      let offset = 0;
      while (pending.length - offset >= currentDataStripeSize) {
        await processStripe(
          pending.subarray(offset, offset + currentDataStripeSize),
        );
        offset += currentDataStripeSize;
      }
      pending = offset === 0 ? pending : pending.subarray(offset);
    }

    // Info: (20260716 - Luphia) 真正 EOF 的最後殘塊，補零後編碼（還原時再依 originalFileSize 裁剪）
    if (pending.length > 0) {
      const paddedStripe = Buffer.alloc(currentDataStripeSize);
      pending.copy(paddedStripe, 0);
      await processStripe(paddedStripe);
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
    // Info: (20260715 - Emily) Fail Fast，編碼失敗必須讓呼叫端（uploadLaria）中止，不可產出殘缺切片
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
 * 舊檔(無 rsVersion)parity 無效，資料切片缺任一即顯式失敗
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
  // Info: (20260716 - Luphia) shardSize 是否來自 metadata，決定讀到尺寸不符時是「切片損毀」還是「尺寸無從得知」
  let shardSizeFromMetadata = false;

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
    // Info: (20260716 - Luphia) 優先讀取 metadata 的 shardSize，若無則降級為預設最大值並標記來源
    shardSizeFromMetadata =
      typeof metaData.shardSize === "number" && metaData.shardSize > 0;
    currentShardSize = shardSizeFromMetadata
      ? (metaData.shardSize as number)
      : MAX_SHARD_SIZE;
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
    lariaLogger.warn("legacy laria file detected (no real parity)", {
      shardsDir,
    });
  }

  const readerHandles: (FileHandle | null)[] = new Array(TOTAL_SHARDS).fill(
    null,
  );
  let foundShards: number = 0;
  let outputHandle: FileHandle | undefined;
  // Info: (20260716 - Luphia) 還原是否完整成功;未成功時 finally 必須刪除已寫出的殘檔
  let recoverySucceeded = false;

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
      // Info: (20260716 - Luphia) 本 stripe 是否有任何切片吐出位元組(含截斷);用來區分「真 EOF」與「全部截斷」
      let readAnyBytesThisStripe = false;

      // Info: (20260415 - Luphia) 以 currentShardSize 讀取每個切片
      const readPromises = readerHandles.map((handle, i) => {
        if (handle) {
          const buffer = Buffer.alloc(currentShardSize);
          readBuffers[i] = buffer;
          return handle.read(buffer, 0, currentShardSize, null);
        }
        return Promise.resolve(null);
      });

      const results = await Promise.all(readPromises);

      // Info: (20260716 - Luphia) 收集本 stripe 需棄用(截斷)的切片句柄,迴圈外統一關閉以避免 await-in-loop
      const handlesToDrop: FileHandle[] = [];

      // Info: (20251028 - Luphia) 檢查讀取結果
      for (let i = 0; i < TOTAL_SHARDS; i++) {
        const result = results[i];
        if (result && result.bytesRead > 0) {
          readAnyBytesThisStripe = true;
          if (result.bytesRead !== currentShardSize) {
            // Info: (20260716 - Luphia) shardSize 非來自 metadata，尺寸無從得知，是配置問題而非切片損毀，給明確錯誤
            if (!shardSizeFromMetadata) {
              throw new Error(
                `[Laria] metadata 缺少 shardSize，無法決定切片大小 (切片 ${i + 1} 讀到 ${result.bytesRead} bytes)。此為極舊版切片，請要求上傳者重新上傳。`,
              );
            }
            // Info: (20260716 - Luphia) 切片截斷/損毀視為此切片遺失，棄用其句柄並交由 RS 以其餘切片重建
            lariaLogger.warn("shard truncated, treated as missing", {
              shardsDir,
              shardIndex: i + 1,
              bytesRead: result.bytesRead,
              expected: currentShardSize,
            });
            const dropped = readerHandles[i];
            if (dropped) handlesToDrop.push(dropped);
            readerHandles[i] = null;
          } else {
            shards[i] = readBuffers[i];
            shardsAvailableThisStripe++;
          }
        }
      }

      // Info: (20260716 - Luphia) 關閉被棄用的截斷切片句柄，已從 readerHandles 移除，finally 不會重複關閉
      if (handlesToDrop.length > 0) {
        await Promise.all(handlesToDrop.map((handle) => handle.close()));
      }

      // Info: (20260716 - Luphia) 只有完全沒有位元組可讀才是真 EOF，若有截斷位元組但不足額，則交由下方切片數檢查
      if (!readAnyBytesThisStripe) {
        break;
      }

      if (shardsAvailableThisStripe < DATA_SHARDS) {
        throw new Error(
          `[Laria] 恢復中途失敗，可用的切片不足 ${DATA_SHARDS} (5) 個`,
        );
      }

      // Info: (20260715 - Emily) 舊檔 parity 為零填充,無法重建遺失的資料切片, 故缺任一資料切片失敗
      const missingDataShard = shards
        .slice(0, DATA_SHARDS)
        .some((shard) => shard === null);
      if (isLegacy && missingDataShard) {
        throw new Error("[Laria] 遺失資料切片，檔案恢復失敗");
      }

      /**
       * Info: (20260715 - Emily) 遺失的切片以 null 傳入,由 reconstruct 判定位置並重建;
       * 不可先填零,否則會銷毀「哪些切片遺失」的資訊。
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
          `[Laria] 完整性驗證失敗: sha256 不符 (expected ${expectedSha256}, got ${actualSha256})`,
        );
      }
    }

    // Info: (20260716 - Luphia) 走到這裡代表已寫完並通過完整性驗證,輸出檔可信
    recoverySucceeded = true;

    lariaLogger.info("recover done", {
      originalFileSize,
      foundShards,
      verified: Boolean(expectedSha256),
    });
  } catch (err: unknown) {
    const errMsg = `[Laria] 恢復處理失敗: ${err instanceof Error ? err.message : String(err)}`;
    lariaLogger.error("recover failed", { shardsDir, error: errMsg });
    throw new Error(errMsg);
  } finally {
    // Info: (20251028 - Luphia) 關閉所有檔案句柄
    const outputWasOpened = Boolean(outputHandle);
    if (outputHandle) await outputHandle.close();
    await Promise.all(readerHandles.map((handle) => handle && handle.close()));

    /**
     * Info: (20260716 - Luphia) 零捏造/Fail Fast:還原未成功(含 sha256 驗證失敗)時,
     * 以 "w" 開啟時已覆寫並可能寫入部分內容,必須刪除殘檔,絕不讓呼叫端誤用可疑輸出。
     * 僅在確實開過輸出檔時才刪,避免動到早期(尚未建檔)失敗路徑下既有的無關檔案。
     */
    if (!recoverySucceeded && outputWasOpened) {
      await fs.rm(outputFilePath, { force: true }).catch(() => {});
    }
  }
}
