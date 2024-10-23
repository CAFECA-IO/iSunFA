import {
  BASE_STORAGE_FOLDER,
  BASE_STORAGE_PLACEHOLDER,
  FileFolder,
  LOG_FOLDER,
  UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER,
} from '@/constants/file';
import { CRYPTO_FOLDER_PATH } from '@/constants/crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { File } from '@prisma/client';
import {
  arrayBufferToBuffer,
  bufferToArrayBuffer,
  bufferToUint8Array,
  decryptFile,
  getPrivateKeyByCompany,
} from '@/lib/utils/crypto';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { STATUS_MESSAGE } from '@/constants/status_code';

export const sanitizeFileName = (fileName: string): string => {
  return encodeURIComponent(fileName);
};

export async function createFileFoldersIfNotExists(): Promise<void> {
  UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER.map(async (folder) => {
    try {
      await fs.mkdir(folder, { recursive: true });
    } catch (error) {
      const logError = loggerError(0, 'createFileFoldersIfNotExists failed', error as Error);
      logError.error('Func. createFileFoldersIfNotExists in file.ts failed');
    }
  });
  CRYPTO_FOLDER_PATH.map(async (folder) => {
    await fs.mkdir(folder, { recursive: true });
  });
  await fs.mkdir(LOG_FOLDER, { recursive: true });
}

/**
 * Info: (20240903 - Murky)
 * Generate file path that looks like "{BASE_URL_PLACEHOLDER}/folderType/fileName"
 * if folderType is provided, otherwise "{BASE_URL_PLACEHOLDER}/fileName"
 * @param fileName - the file name
 * @param folderType - the folder type (optional)
 * @returns - the file path
 */
export function generateFilePathWithBaseUrlPlaceholder(
  fileName: string,
  folderType?: FileFolder
): string {
  const filePath = folderType
    ? path.join(BASE_STORAGE_PLACEHOLDER, folderType, fileName)
    : path.join(BASE_STORAGE_PLACEHOLDER, fileName);
  return filePath;
}

/**
 * Info: (20240903 - Murky)
 * Parse file path with base url placeholder, change "{BASE_URL_PLACEHOLDER}" to "{BASE_STORAGE_FOLDER}"
 * Do nothing if the placeholder is not found
 * @param filePath - the file path
 * @returns - the parsed file path
 */
export function parseFilePathWithBaseUrlPlaceholder(filePath: string): string {
  if (filePath.includes(BASE_STORAGE_PLACEHOLDER)) {
    return filePath.replace(BASE_STORAGE_PLACEHOLDER, BASE_STORAGE_FOLDER);
  } else {
    return filePath;
  }
}

export async function decryptImageFile({
  imageBuffer,
  file,
  companyId,
}: {
  imageBuffer: Buffer;
  file: File;
  companyId: number;
}): Promise<Buffer> {
  const { isEncrypted, encryptedSymmetricKey, iv } = file;
  let decryptedBuffer = imageBuffer;

  if (isEncrypted && encryptedSymmetricKey && iv) {
    const encryptedArrayBuffer: ArrayBuffer = bufferToArrayBuffer(imageBuffer);
    const privateKey = await getPrivateKeyByCompany(companyId);

    if (!privateKey) {
      loggerBack.error(`Private key not found in decryptImageFile in image/[imageId]: ${file.id}`);
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }
    const ivUint8Array = bufferToUint8Array(iv);
    const decryptedArrayBuffer = await decryptFile(
      encryptedArrayBuffer,
      encryptedSymmetricKey,
      privateKey,
      ivUint8Array
    );

    decryptedBuffer = arrayBufferToBuffer(decryptedArrayBuffer);
  }

  return decryptedBuffer;
}
