/**
 * Info: (20250529 - Shirley) 批量 PDF 縮略圖生成維護腳本
 *
 * 這是一個一次性執行的維護腳本，用於為現有的 PDF 檔案批量生成縮略圖。
 *
 * 安全措施：
 * - 需要環境變數 ENABLE_MAINTENANCE_SCRIPTS=true 才能執行
 * - 具備防重複執行機制
 *
 * 使用方式：
 * POST /api/v2/admin/maintenance/pdf-thumbnails-batch
 * Body: { "force": false } // 是否強制重新執行
 *
 * @route POST /api/v2/admin/maintenance/pdf-thumbnails-batch
 */

import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs/promises';
import path from 'path';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { generatePDFThumbnail } from '@/lib/utils/pdf_thumbnail';
import {
  getPrivateKeyByCompany,
  getPublicKeyByCompany,
  encryptFile,
  decryptFile,
  uint8ArrayToBuffer,
} from '@/lib/utils/crypto';
import { createFile, putFileById } from '@/lib/utils/repo/file.repo';
import { generateFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';
import loggerBack from '@/lib/utils/logger_back';
import prisma from '@/client';
import { FileFolder } from '@/constants/file';

// Info: (20250529 - Shirley) 執行狀態緩存（簡單的內存緩存）
let isExecuting = false;
let lastExecutionTime = 0;

interface BatchThumbnailRequest {
  force?: boolean; // Info: (20250529 - Shirley) 是否強制重新執行
}

interface BatchThumbnailResponse {
  executionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  totalFound: number;
  totalProcessed: number;
  notFound: string[];
  successCount: number;
  failureCount: number;
  results: Array<{
    fileId: number;
    fileName: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Info: (20250529 - Shirley) 檢查環境變數
 */
function validateEnvironment(): { isValid: boolean; error?: string } {
  // Info: (20250529 - Shirley) 檢查是否啟用維護腳本
  if (process.env.ENABLE_MAINTENANCE_SCRIPTS !== 'true') {
    return {
      isValid: false,
      error: 'Maintenance scripts are disabled. Set ENABLE_MAINTENANCE_SCRIPTS=true to enable.',
    };
  }

  return { isValid: true };
}

/**
 * Info: (20250529 - Shirley) 檢查是否可以執行（防重複執行）
 */
function canExecute(force = false): { canExecute: boolean; reason?: string } {
  const now = Date.now();
  const cooldownPeriod = 60 * 1000; // Info: (20250529 - Shirley) 1分鐘冷卻期

  if (isExecuting) {
    return {
      canExecute: false,
      reason: 'Another execution is currently in progress.',
    };
  }

  if (!force && lastExecutionTime > 0 && now - lastExecutionTime < cooldownPeriod) {
    return {
      canExecute: false,
      reason: `Cooldown period active. Last execution was ${Math.round((now - lastExecutionTime) / 1000)} seconds ago.`,
    };
  }

  return { canExecute: true };
}

/**
 * Info: (20250529 - Shirley) Process a single PDF file to generate and associate a thumbnail
 * @param pdfPath The path to the PDF file
 * @param fileId The database ID of the file
 * @param accountBookId The account book ID associated with the file
 * @param isEncrypted Whether the file is encrypted
 * @param encryptedSymmetricKey The encrypted symmetric key for decryption
 * @param iv The initialization vector for decryption
 * @param retryCount Current retry attempt (default: 0)
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns Object containing the file ID and success status
 */
async function processPdfFile(
  pdfPath: string,
  fileId: number,
  accountBookId: number,
  isEncrypted: boolean,
  encryptedSymmetricKey: string,
  iv: Buffer,
  retryCount = 0,
  maxRetries = 3
) {
  let tempDecryptedPath = '';

  try {
    loggerBack.info(
      `[PDF_BATCH_THUMBNAIL] Processing file ID ${fileId}, path: ${pdfPath}, attempt: ${retryCount + 1}/${maxRetries + 1}`
    );

    // Info: (20250529 - Shirley) 如果檔案是加密的，先解密
    if (isEncrypted) {
      loggerBack.info(`[PDF_BATCH_THUMBNAIL] Decrypting PDF file: ${pdfPath}`);
      try {
        // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: Admin 批次)
        const encryptedFileBuffer = await fs.readFile(pdfPath);
        const arrayBuffer = new Uint8Array(encryptedFileBuffer).buffer;
        const privateKey = await getPrivateKeyByCompany(accountBookId);

        if (!privateKey) {
          throw new Error('Private key not found for decryption');
        }

        const ivUint8Array = new Uint8Array(iv);
        const decryptedBuffer = await decryptFile(
          arrayBuffer,
          encryptedSymmetricKey,
          privateKey,
          ivUint8Array
        );

        // Info: (20250529 - Shirley) 將解密後的檔案寫入臨時檔案
        // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: Admin 批次)
        tempDecryptedPath = `${pdfPath.replace(/\.[^/.]+$/, '')}_decrypted.pdf`;
        await fs.writeFile(tempDecryptedPath, Buffer.from(decryptedBuffer));
        loggerBack.info(
          `[PDF_BATCH_THUMBNAIL] PDF decryption completed, temporary file: ${tempDecryptedPath}`
        );

        // Info: (20250529 - Shirley) 確認臨時檔案已成功寫入
        // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: Admin 批次)
        const tempFileStats = await fs.stat(tempDecryptedPath);
        loggerBack.info(`[PDF_BATCH_THUMBNAIL] Temporary file size: ${tempFileStats.size} bytes`);
        if (tempFileStats.size === 0) {
          throw new Error('Decrypted file was created but has zero size');
        }
      } catch (decryptionError) {
        loggerBack.error(decryptionError, `[PDF_BATCH_THUMBNAIL] Error decrypting PDF: ${pdfPath}`);

        // Info: (20250529 - Shirley) 如果解密失敗，重試
        if (retryCount < maxRetries) {
          loggerBack.info(
            `[PDF_BATCH_THUMBNAIL] Retrying decryption for file ID ${fileId}, attempt ${retryCount + 2}/${maxRetries + 1}`
          );
          return processPdfFile(
            pdfPath,
            fileId,
            accountBookId,
            isEncrypted,
            encryptedSymmetricKey,
            iv,
            retryCount + 1,
            maxRetries
          );
        }
        throw new Error('Failed to decrypt PDF file after maximum retries');
      }
    }

    // Info: (20250529 - Shirley) 產生縮略圖
    const sourcePath = isEncrypted ? tempDecryptedPath : pdfPath;
    loggerBack.info(`[PDF_BATCH_THUMBNAIL] Generating thumbnail from: ${sourcePath}`);

    try {
      const thumbnailInfo = await generatePDFThumbnail(sourcePath, {
        removeString: '_decrypted',
        suffix: '_thumbnail',
      });

      if (!thumbnailInfo.success) {
        throw new Error('Failed to generate PDF thumbnail');
      }

      loggerBack.info(
        `[PDF_BATCH_THUMBNAIL] Thumbnail generation successful: ${thumbnailInfo.filepath}, size: ${thumbnailInfo.size} bytes`
      );

      // Info: (20250529 - Shirley) 確認縮略圖檔案已成功產生
      // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: Admin 批次)
      const thumbnailStats = await fs.stat(thumbnailInfo.filepath);
      if (thumbnailStats.size === 0 || thumbnailStats.size !== thumbnailInfo.size) {
        throw new Error('Thumbnail was created but has incorrect file size');
      }

      // Info: (20250529 - Shirley) 處理縮略圖
      // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: Admin 批次)
      const thumbnailFileName = path.basename(thumbnailInfo.filepath);
      const thumbnailUrl = generateFilePathWithBaseUrlPlaceholder(
        thumbnailFileName,
        FileFolder.INVOICE
      );

      // Info: (20250529 - Shirley) 如果原檔案是加密的，則對縮略圖進行加密
      if (isEncrypted) {
        loggerBack.info(`[PDF_BATCH_THUMBNAIL] Encrypting thumbnail: ${thumbnailInfo.filepath}`);
        try {
          // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: Admin 批次)
          const thumbnailBuffer = await fs.readFile(thumbnailInfo.filepath);
          loggerBack.info(
            `[PDF_BATCH_THUMBNAIL] Read thumbnail file into buffer, size: ${thumbnailBuffer.length} bytes`
          );

          const publicKey = await getPublicKeyByCompany(accountBookId);

          if (!publicKey) {
            throw new Error('Public key not found for encryption');
          }

          // Info: (20250529 - Shirley) 使用新的 IV 參數
          const newIv = crypto.getRandomValues(new Uint8Array(16));

          // Info: (20250529 - Shirley) 執行加密
          const { encryptedContent, encryptedSymmetricKey: thumbnailEncryptedKey } =
            await encryptFile(
              new Uint8Array(thumbnailBuffer).buffer as ArrayBuffer,
              publicKey,
              newIv
            );

          if (!encryptedContent) {
            loggerBack.error(
              '[PDF_BATCH_THUMBNAIL] Failed to encrypt thumbnail - encryptedContent is null or empty'
            );
            throw new Error('Thumbnail encryption failed');
          }

          loggerBack.info(
            `[PDF_BATCH_THUMBNAIL] Thumbnail encrypted successfully, encrypted content size: ${encryptedContent.byteLength} bytes`
          );

          // Info: (20250529 - Shirley) 寫入加密縮略圖
          // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: Admin 批次)
          await fs.writeFile(thumbnailInfo.filepath, Buffer.from(encryptedContent));

          // Info: (20250529 - Shirley) 確認加密後的縮略圖檔案已成功寫入
          const encryptedThumbnailStats = await fs.stat(thumbnailInfo.filepath);
          loggerBack.info(
            `[PDF_BATCH_THUMBNAIL] Encrypted thumbnail file size: ${encryptedThumbnailStats.size} bytes`
          );

          // Info: (20250529 - Shirley) 將新的 IV 轉換為 Buffer 以存儲在數據庫中
          const newIvBuffer = uint8ArrayToBuffer(newIv);

          // Info: (20250529 - Shirley) 將縮略圖資訊添加到數據庫
          const thumbnailInDB = await createFile({
            name: thumbnailFileName,
            size: encryptedThumbnailStats.size,
            mimeType: 'image/png',
            type: FileFolder.INVOICE,
            url: thumbnailUrl,
            isEncrypted: true,
            encryptedSymmetricKey: thumbnailEncryptedKey,
            iv: newIvBuffer,
          });

          loggerBack.info(
            `[PDF_BATCH_THUMBNAIL] Thumbnail record created in database with ID: ${thumbnailInDB?.id || 'unknown'}`
          );

          if (thumbnailInDB) {
            // Info: (20250529 - Shirley) 更新原始檔案記錄，添加縮略圖 ID
            await putFileById(fileId, {
              thumbnailId: thumbnailInDB.id,
            });
            loggerBack.info(
              `[PDF_BATCH_THUMBNAIL] Associated thumbnail ID ${thumbnailInDB.id} with file ID ${fileId}`
            );
          }
        } catch (encryptionError) {
          loggerBack.error(
            encryptionError,
            `[PDF_BATCH_THUMBNAIL] Error during thumbnail encryption: ${thumbnailFileName}`
          );
          loggerBack.info(
            `[PDF_BATCH_THUMBNAIL] Creating unencrypted thumbnail record as fallback due to encryption error`
          );

          // Info: (20250529 - Shirley) 創建未加密的縮略圖記錄作為後備方案
          const thumbnailInDB = await createFile({
            name: thumbnailFileName,
            size: thumbnailInfo.size,
            mimeType: 'image/png',
            type: FileFolder.INVOICE,
            url: thumbnailUrl,
            isEncrypted: false,
            encryptedSymmetricKey: '',
            iv: Buffer.from([]),
          });

          if (thumbnailInDB) {
            await putFileById(fileId, {
              thumbnailId: thumbnailInDB.id,
            });
            loggerBack.info(
              `[PDF_BATCH_THUMBNAIL] Associated fallback thumbnail ID ${thumbnailInDB.id} with file ID ${fileId}`
            );
          }
        }
      } else {
        // Info: (20250529 - Shirley) 如果原檔案不是加密的，則直接存儲縮略圖資訊
        const thumbnailInDB = await createFile({
          name: thumbnailFileName,
          size: thumbnailInfo.size,
          mimeType: 'image/png',
          type: FileFolder.INVOICE,
          url: thumbnailUrl,
          isEncrypted: false,
          encryptedSymmetricKey: '',
          iv: Buffer.from([]),
        });

        if (thumbnailInDB) {
          await putFileById(fileId, {
            thumbnailId: thumbnailInDB.id,
          });
          loggerBack.info(
            `[PDF_BATCH_THUMBNAIL] Associated thumbnail ID ${thumbnailInDB.id} with file ID ${fileId}`
          );
        }
      }

      return {
        fileId,
        success: true,
      };
    } catch (thumbnailError) {
      loggerBack.error(
        thumbnailError,
        `[PDF_BATCH_THUMBNAIL] Error generating or processing thumbnail for file ID ${fileId}`
      );

      // Info: (20250529 - Shirley) 如果縮略圖處理失敗，重試
      if (retryCount < maxRetries) {
        loggerBack.info(
          `[PDF_BATCH_THUMBNAIL] Retrying thumbnail generation for file ID ${fileId}, attempt ${retryCount + 2}/${maxRetries + 1}`
        );
        return processPdfFile(
          pdfPath,
          fileId,
          accountBookId,
          isEncrypted,
          encryptedSymmetricKey,
          iv,
          retryCount + 1,
          maxRetries
        );
      }
      throw thumbnailError;
    }
  } catch (error) {
    loggerBack.error(error, `[PDF_BATCH_THUMBNAIL] Error processing PDF file: ${pdfPath}`);
    return {
      fileId,
      success: false,
      error: (error as Error).message,
    };
  } finally {
    // Info: (20250529 - Shirley) 移除臨時解密檔案
    if (tempDecryptedPath) {
      try {
        // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: Admin 批次)
        await fs.unlink(tempDecryptedPath);
        loggerBack.info(
          `[PDF_BATCH_THUMBNAIL] Deleted temporary decrypted file: ${tempDecryptedPath}`
        );
      } catch (error) {
        loggerBack.warn(
          error,
          `[PDF_BATCH_THUMBNAIL] Failed to delete temporary decrypted file: ${tempDecryptedPath}`
        );
      }
    }
  }
}

/**
 * Info: (20250529 - Shirley) 連續處理檔案，確保每個檔案都完成處理後再處理下一個
 * @param fileDataList 待處理的檔案資訊列表
 * @returns 處理結果列表
 */
async function processFilesSequentially(
  fileDataList: Array<{
    id: number;
    name: string;
    url: string;
    isEncrypted: boolean;
    encryptedSymmetricKey: string;
    iv: Buffer;
    certificate: {
      accountBookId: number;
      accountBook: {
        id: number;
        name: string;
      };
    } | null;
  }>
) {
  return fileDataList.reduce(
    async (previousPromise, fileData) => {
      const results = await previousPromise;
      const { id, name, url, isEncrypted, encryptedSymmetricKey, iv, certificate } = fileData;

      // Info: (20250529 - Shirley) 獲取賬本 ID
      const accountBookId = certificate?.accountBookId;
      const accountBookName = certificate?.accountBook?.name;

      if (!accountBookId) {
        loggerBack.warn(
          `[PDF_BATCH_THUMBNAIL] Skipping file ID ${id}, name: ${name} - No account book ID associated`
        );
        results.push({
          fileId: id,
          fileName: name,
          success: false,
          error: 'No account book ID associated',
        });
        return results;
      }

      loggerBack.info(
        `[PDF_BATCH_THUMBNAIL] Starting processing for file ID ${id}, name: ${name}, account book: ${accountBookName} (ID: ${accountBookId})`
      );

      // Info: (20250529 - Shirley) 獲取實際文件路徑
      const basePath =
        process.env.BASE_STORAGE_PATH?.replace(/\$\{HOME\}/g, process.env.HOME || '') || '';
      const pdfPath = url.replace('{BASE_URL_PLACEHOLDER}', basePath);

      loggerBack.info(
        `[PDF_BATCH_THUMBNAIL] Base path: ${basePath}, File URL: ${url}, Resolved path: ${pdfPath}`
      );

      try {
        // Info: (20250529 - Shirley) 檢查檔案是否存在
        await fs.access(pdfPath);

        // Info: (20250529 - Shirley) 處理此PDF檔案
        loggerBack.info(`[PDF_BATCH_THUMBNAIL] Processing PDF file: ${pdfPath}`);
        const result = await processPdfFile(
          pdfPath,
          id,
          accountBookId,
          isEncrypted,
          encryptedSymmetricKey,
          iv
        );

        results.push({
          ...result,
          fileName: name,
        });

        loggerBack.info(
          `[PDF_BATCH_THUMBNAIL] Completed processing for file ID ${id}, name: ${name}, success: ${result.success}`
        );
      } catch (fileError) {
        loggerBack.error(
          fileError,
          `[PDF_BATCH_THUMBNAIL] File does not exist or is not accessible: ${pdfPath}`
        );
        results.push({
          fileId: id,
          fileName: name,
          success: false,
          error: 'File not accessible',
        });
      }

      // Info: (20250529 - Shirley) 在每個檔案處理完後短暫暫停，避免資源爭用
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });

      return results;
    },
    Promise.resolve(
      [] as Array<{
        fileId: number;
        fileName: string;
        success: boolean;
        error?: string;
      }>
    )
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<BatchThumbnailResponse | null>>
) {
  if (req.method !== 'POST') {
    const { httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null);
    return res.status(httpCode).json(result);
  }

  // Info: (20250529 - Shirley) 驗證環境變數
  const environmentCheck = validateEnvironment();
  if (!environmentCheck.isValid) {
    loggerBack.warn(
      `[PDF_BATCH_THUMBNAIL] Environment validation failed: ${environmentCheck.error}`
    );
    const { httpCode, result } = formatApiResponse(STATUS_MESSAGE.FORBIDDEN, null);
    return res.status(httpCode).json(result);
  }

  const { force = false }: BatchThumbnailRequest = req.body;

  // Info: (20250529 - Shirley) 檢查是否可以執行
  const executionCheck = canExecute(force);
  if (!executionCheck.canExecute) {
    loggerBack.info(`[PDF_BATCH_THUMBNAIL] Execution blocked: ${executionCheck.reason}`);
    const { httpCode, result } = formatApiResponse(STATUS_MESSAGE.CONFLICT, null);
    return res.status(httpCode).json(result);
  }

  const executionId = `batch-thumbnail-${Date.now()}`;
  const startTime = Date.now();

  // Info: (20250529 - Shirley) 設置執行狀態
  isExecuting = true;
  lastExecutionTime = startTime;

  loggerBack.info(
    `[PDF_BATCH_THUMBNAIL] Starting batch thumbnail generation - Execution ID: ${executionId}`
  );

  try {
    // Info: (20250529 - Shirley) 獲取 invoice 資料夾路徑並讀取所有 PDF 檔案
    // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: 路徑組合)
    const invoiceFolderPath = path.join(process.env.BASE_STORAGE_PATH || '', 'invoice');
    loggerBack.info(`[PDF_BATCH_THUMBNAIL] Scanning PDF files in: ${invoiceFolderPath}`);
    // Info: (20250529 - Shirley) 讀取資料夾中的所有檔案
    // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: Admin 批次)
    const files = await fs.readdir(invoiceFolderPath);
    // Info: (20250529 - Shirley) 篩選出 PDF 檔案
    const pdfFiles = files.filter((file) => file.toLowerCase().endsWith('.pdf'));

    loggerBack.info(
      `[PDF_BATCH_THUMBNAIL] Found ${pdfFiles.length} PDF files in ${invoiceFolderPath}`
    );

    // Info: (20250529 - Shirley) 取得所有 PDF 檔案的檔名列表
    const targetFileNames = pdfFiles;

    // Info: (20250529 - Shirley) 獲取檔案資訊和對應的公司ID的SQL邏輯實現
    const fileDataWithCompanyId = await prisma.file.findMany({
      where: {
        name: {
          in: targetFileNames,
        },
        thumbnailId: null, // Info: (20250529 - Shirley) 只處理還沒有縮圖的檔案
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        url: true,
        isEncrypted: true,
        encryptedSymmetricKey: true,
        iv: true,
        certificate: {
          select: {
            accountBookId: true,
            accountBook: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    loggerBack.info(
      `[PDF_BATCH_THUMBNAIL] Found ${fileDataWithCompanyId.length} matching files in database without thumbnails`
    );

    // Info: (20250529 - Shirley) 連續處理檔案，確保每個檔案處理完成後再處理下一個
    const results = await processFilesSequentially(fileDataWithCompanyId);

    // Info: (20250529 - Shirley) 找出未處理的檔案
    const processedFileNames = fileDataWithCompanyId.map((file) => file.name);
    const notFoundFiles = targetFileNames.filter((name) => !processedFileNames.includes(name));

    if (notFoundFiles.length > 0) {
      loggerBack.warn(
        `[PDF_BATCH_THUMBNAIL] ${notFoundFiles.length} files not found in database: ${notFoundFiles.join(', ')}`
      );
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const successCount = results.filter((r) => r.success).length;

    // Info: (20250529 - Shirley) 準備執行結果
    const executionResult: BatchThumbnailResponse = {
      executionId,
      startTime,
      endTime,
      duration,
      totalFound: pdfFiles.length,
      totalProcessed: fileDataWithCompanyId.length,
      notFound: notFoundFiles,
      successCount,
      failureCount: fileDataWithCompanyId.length - successCount,
      results,
    };

    loggerBack.info(
      `[PDF_BATCH_THUMBNAIL] Batch thumbnail generation completed - Execution ID: ${executionId}, Duration: ${duration}ms, Success: ${successCount}/${fileDataWithCompanyId.length}`
    );

    // Info: (20250529 - Shirley) 返回處理結果
    const { httpCode, result } = formatApiResponse(STATUS_MESSAGE.SUCCESS, executionResult);
    return res.status(httpCode).json(result);
  } catch (error) {
    loggerBack.error(
      error,
      `[PDF_BATCH_THUMBNAIL] Error during batch PDF thumbnail generation - Execution ID: ${executionId}`
    );
    const err = error as Error;
    const statusMessage =
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
      STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    const { httpCode, result } = formatApiResponse(statusMessage, null);
    return res.status(httpCode).json(result);
  } finally {
    // Info: (20250529 - Shirley) 重置執行狀態
    isExecuting = false;
  }
}
