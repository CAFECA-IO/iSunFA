/* eslint-disable */
// TODO: 批量對 {process.env.BASE_STORAGE_PATH}/invoice 下的 PDF 檔案產生縮略圖的簡單 API，不做權限檢查，需要在每一步驟寫出 log
// src/pages/api/v2/pdf/thumbnail.ts
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
import { FileFolder, UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';

/**
 * Info: (20250514 - Shirley) Process a single PDF file to generate and associate a thumbnail
 * @param pdfPath The path to the PDF file
 * @param fileId The database ID of the file
 * @param companyId The company ID associated with the file
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
  companyId: number,
  isEncrypted: boolean,
  encryptedSymmetricKey: string,
  iv: Buffer,
  retryCount = 0,
  maxRetries = 3
) {
  let tempDecryptedPath = '';

  try {
    loggerBack.info(
      `Processing file ID ${fileId}, path: ${pdfPath}, attempt: ${retryCount + 1}/${maxRetries + 1}`
    );

    // Info: (20250514 - Shirley) 如果檔案是加密的，先解密
    if (isEncrypted) {
      loggerBack.info(`Decrypting PDF file: ${pdfPath}`);
      try {
        const encryptedFileBuffer = await fs.readFile(pdfPath);
        const arrayBuffer = new Uint8Array(encryptedFileBuffer).buffer;
        const privateKey = await getPrivateKeyByCompany(companyId);

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

        // Info: (20250514 - Shirley) 將解密後的檔案寫入臨時檔案
        tempDecryptedPath = `${pdfPath.replace(/\.[^/.]+$/, '')}_decrypted.pdf`;
        await fs.writeFile(tempDecryptedPath, Buffer.from(decryptedBuffer));
        loggerBack.info(`PDF decryption completed, temporary file: ${tempDecryptedPath}`);

        // Info: (20250514 - Shirley) 確認臨時檔案已成功寫入
        const tempFileStats = await fs.stat(tempDecryptedPath);
        loggerBack.info(`Temporary file size: ${tempFileStats.size} bytes`);
        if (tempFileStats.size === 0) {
          throw new Error('Decrypted file was created but has zero size');
        }
      } catch (decryptionError) {
        loggerBack.error(decryptionError, `Error decrypting PDF: ${pdfPath}`);

        // Info: (20250514 - Shirley) 如果解密失敗，重試
        if (retryCount < maxRetries) {
          loggerBack.info(
            `Retrying decryption for file ID ${fileId}, attempt ${retryCount + 2}/${maxRetries + 1}`
          );
          return processPdfFile(
            pdfPath,
            fileId,
            companyId,
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

    // Info: (20250514 - Shirley) 產生縮略圖
    const sourcePath = isEncrypted ? tempDecryptedPath : pdfPath;
    loggerBack.info(`Generating thumbnail from: ${sourcePath}`);

    try {
      const thumbnailInfo = await generatePDFThumbnail(sourcePath, {
        removeString: '_decrypted',
        suffix: '_thumbnail',
      });

      if (!thumbnailInfo.success) {
        throw new Error('Failed to generate PDF thumbnail');
      }

      loggerBack.info(
        `Thumbnail generation successful: ${thumbnailInfo.filepath}, size: ${thumbnailInfo.size} bytes`
      );

      // Info: (20250514 - Shirley) 確認縮略圖檔案已成功產生
      const thumbnailStats = await fs.stat(thumbnailInfo.filepath);
      if (thumbnailStats.size === 0 || thumbnailStats.size !== thumbnailInfo.size) {
        throw new Error('Thumbnail was created but has incorrect file size');
      }

      // Info: (20250514 - Shirley) 處理縮略圖
      const thumbnailFileName = path.basename(thumbnailInfo.filepath);
      const thumbnailUrl = generateFilePathWithBaseUrlPlaceholder(
        thumbnailFileName,
        FileFolder.INVOICE
      );

      // Info: (20250514 - Shirley) 如果原檔案是加密的，則對縮略圖進行加密
      if (isEncrypted) {
        loggerBack.info(`Encrypting thumbnail: ${thumbnailInfo.filepath}`);
        try {
          const thumbnailBuffer = await fs.readFile(thumbnailInfo.filepath);
          loggerBack.info(`Read thumbnail file into buffer, size: ${thumbnailBuffer.length} bytes`);

          const publicKey = await getPublicKeyByCompany(companyId);

          if (!publicKey) {
            throw new Error('Public key not found for encryption');
          }

          // Info: (20250514 - Shirley) 使用新的 IV 參數
          const newIv = crypto.getRandomValues(new Uint8Array(16));

          // Info: (20250514 - Shirley) 執行加密
          const { encryptedContent, encryptedSymmetricKey: thumbnailEncryptedKey } =
            await encryptFile(
              new Uint8Array(thumbnailBuffer).buffer as ArrayBuffer,
              publicKey,
              newIv
            );

          if (!encryptedContent) {
            loggerBack.error('Failed to encrypt thumbnail - encryptedContent is null or empty');
            throw new Error('Thumbnail encryption failed');
          }

          loggerBack.info(
            `Thumbnail encrypted successfully, encrypted content size: ${encryptedContent.byteLength} bytes`
          );

          // Info: (20250514 - Shirley) 寫入加密縮略圖
          await fs.writeFile(thumbnailInfo.filepath, Buffer.from(encryptedContent));

          // Info: (20250514 - Shirley) 確認加密後的縮略圖檔案已成功寫入
          const encryptedThumbnailStats = await fs.stat(thumbnailInfo.filepath);
          loggerBack.info(`Encrypted thumbnail file size: ${encryptedThumbnailStats.size} bytes`);

          // Info: (20250514 - Shirley) 將新的 IV 轉換為 Buffer 以存儲在數據庫中
          const newIvBuffer = uint8ArrayToBuffer(newIv);

          // Info: (20250514 - Shirley) 將縮略圖資訊添加到數據庫
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
            `Thumbnail record created in database with ID: ${thumbnailInDB?.id || 'unknown'}`
          );

          if (thumbnailInDB) {
            // Info: (20250514 - Shirley) 更新原始檔案記錄，添加縮略圖 ID
            await putFileById(fileId, {
              thumbnailId: thumbnailInDB.id,
            });
            loggerBack.info(`Associated thumbnail ID ${thumbnailInDB.id} with file ID ${fileId}`);
          }
        } catch (encryptionError) {
          loggerBack.error(
            encryptionError,
            `Error during thumbnail encryption: ${thumbnailFileName}`
          );
          loggerBack.info(
            `Creating unencrypted thumbnail record as fallback due to encryption error`
          );

          // Info: (20250514 - Shirley) 創建未加密的縮略圖記錄作為後備方案
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
              `Associated fallback thumbnail ID ${thumbnailInDB.id} with file ID ${fileId}`
            );
          }
        }
      } else {
        // Info: (20250514 - Shirley) 如果原檔案不是加密的，則直接存儲縮略圖資訊
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
          loggerBack.info(`Associated thumbnail ID ${thumbnailInDB.id} with file ID ${fileId}`);
        }
      }

      return {
        fileId,
        success: true,
      };
    } catch (thumbnailError) {
      loggerBack.error(
        thumbnailError,
        `Error generating or processing thumbnail for file ID ${fileId}`
      );

      // Info: (20250514 - Shirley) 如果縮略圖處理失敗，重試
      if (retryCount < maxRetries) {
        loggerBack.info(
          `Retrying thumbnail generation for file ID ${fileId}, attempt ${retryCount + 2}/${maxRetries + 1}`
        );
        return processPdfFile(
          pdfPath,
          fileId,
          companyId,
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
    loggerBack.error(error, `Error processing PDF file: ${pdfPath}`);
    return {
      fileId,
      success: false,
      error: (error as Error).message,
    };
  } finally {
    // Info: (20250514 - Shirley) 移除臨時解密檔案
    if (tempDecryptedPath) {
      try {
        await fs.unlink(tempDecryptedPath);
        loggerBack.info(`Deleted temporary decrypted file: ${tempDecryptedPath}`);
      } catch (error) {
        loggerBack.warn(error, `Failed to delete temporary decrypted file: ${tempDecryptedPath}`);
      }
    }
  }
}

/**
 * Info: (20250514 - Shirley) 連續處理檔案，確保每個檔案都完成處理後再處理下一個
 * @param fileDataList 待處理的檔案資訊列表
 * @returns 處理結果列表
 */
async function processFilesSequentially(fileDataList: any[]) {
  const results = [];

  // Info: (20250514 - Shirley) 逐一處理每個檔案，而不是並行處理
  for (const fileData of fileDataList) {
    const { id, name, url, isEncrypted, encryptedSymmetricKey, iv, certificate } = fileData;

    // Info: (20250514 - Shirley) 獲取公司ID
    const companyId = certificate?.companyId;
    const companyName = certificate?.company?.name;

    if (!companyId) {
      loggerBack.warn(`Skipping file ID ${id}, name: ${name} - No company ID associated`);
      results.push({
        fileId: id,
        fileName: name,
        success: false,
        error: 'No company ID associated',
      });
      continue;
    }

    loggerBack.info(
      `Starting processing for file ID ${id}, name: ${name}, company: ${companyName} (ID: ${companyId})`
    );

    // Info: (20250514 - Shirley) 獲取實際文件路徑
    const pdfPath = url.replace('/baseurl/', '');

    try {
      // Info: (20250514 - Shirley) 檢查檔案是否存在
      await fs.access(pdfPath);

      // Info: (20250514 - Shirley) 處理此PDF檔案
      loggerBack.info(`Processing PDF file: ${pdfPath}`);
      const result = await processPdfFile(
        pdfPath,
        id,
        companyId,
        isEncrypted,
        encryptedSymmetricKey,
        iv
      );

      results.push({
        ...result,
        fileName: name,
      });

      loggerBack.info(
        `Completed processing for file ID ${id}, name: ${name}, success: ${result.success}`
      );
    } catch (fileError) {
      loggerBack.error(fileError, `File does not exist or is not accessible: ${pdfPath}`);
      results.push({
        fileId: id,
        fileName: name,
        success: false,
        error: 'File not accessible',
      });
    }

    // Info: (20250514 - Shirley) 在每個檔案處理完後短暫暫停，避免資源爭用
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<any>>
) {
  if (req.method !== 'POST') {
    const { httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null);
    return res.status(httpCode).json(result);
  }

  try {
    // Info: (20250514 - Shirley) 獲取 invoice 資料夾路徑並讀取所有 PDF 檔案
    const invoiceFolderPath = path.join(process.env.BASE_STORAGE_PATH || '', 'invoice');
    loggerBack.info(`Scanning PDF files in: ${invoiceFolderPath}`);

    // 讀取資料夾中的所有檔案
    const files = await fs.readdir(invoiceFolderPath);
    // 篩選出 PDF 檔案
    const pdfFiles = files.filter((file) => file.toLowerCase().endsWith('.pdf'));

    loggerBack.info(`Found ${pdfFiles.length} PDF files in ${invoiceFolderPath}`);

    // 取得所有 PDF 檔案的檔名列表
    const targetFileNames = pdfFiles;

    // Info: (20250514 - Shirley) 獲取檔案資訊和對應的公司ID的SQL邏輯實現
    const fileDataWithCompanyId = await prisma.file.findMany({
      where: {
        name: {
          in: targetFileNames,
        },
        // mimeType: 'application/pdf',
        thumbnailId: null, // 只處理還沒有縮圖的檔案
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
            companyId: true,
            company: {
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
      `Found ${fileDataWithCompanyId.length} matching files in database without thumbnails`
    );

    // Info: (20250514 - Shirley) 連續處理檔案，確保每個檔案處理完成後再處理下一個
    const results = await processFilesSequentially(fileDataWithCompanyId);

    // Info: (20250514 - Shirley) 找出未處理的檔案
    const processedFileNames = fileDataWithCompanyId.map((file) => file.name);
    const notFoundFiles = targetFileNames.filter((name) => !processedFileNames.includes(name));

    if (notFoundFiles.length > 0) {
      loggerBack.warn(
        `${notFoundFiles.length} files not found in database: ${notFoundFiles.join(', ')}`
      );
    }

    // Info: (20250514 - Shirley) 返回處理結果
    const successCount = results.filter((r) => r.success).length;
    const { httpCode, result } = formatApiResponse(STATUS_MESSAGE.SUCCESS, {
      totalFound: pdfFiles.length,
      totalProcessed: fileDataWithCompanyId.length,
      notFound: notFoundFiles,
      successCount,
      failureCount: fileDataWithCompanyId.length - successCount,
      results,
    });

    return res.status(httpCode).json(result);
  } catch (error) {
    loggerBack.error(error, 'Error during batch PDF thumbnail generation');
    const err = error as Error;
    const statusMessage =
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
      STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    const { httpCode, result } = formatApiResponse(statusMessage, null);
    return res.status(httpCode).json(result);
  }
}
