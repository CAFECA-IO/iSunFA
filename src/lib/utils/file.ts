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
import { File, File as PrismaFile } from '@prisma/client';
import {
  arrayBufferToBuffer,
  bufferToArrayBuffer,
  bufferToUint8Array,
  decryptFile,
  encryptFile,
  getPrivateKeyByCompany,
  uint8ArrayToBuffer,
} from '@/lib/utils/crypto';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IFileEntity } from '@/interfaces/file';
import { getTimestampNow } from '@/lib/utils/common';
import { DefaultValue } from '@/constants/default_value';
import { IV_LENGTH } from '@/constants/config';

// ToDo: (20250710 - Luphia) Use IPFS to store files (S2: 文件夾管理/路徑組合)
export async function createFileFoldersIfNotExists(): Promise<void> {
  UPLOAD_IMAGE_FOLDERS_TO_CREATE_WHEN_START_SERVER.map(async (folder) => {
    try {
      await fs.mkdir(folder, { recursive: true });
    } catch (error) {
      loggerError({
        userId: DefaultValue.USER_ID.SYSTEM,
        errorType: 'createFileFoldersIfNotExists failed',
        errorMessage: error as Error,
      });
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
// ToDo: (20250710 - Luphia) Use IPFS to store files (S2: 文件夾管理/路徑組合)
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

export function getImageUrlFromFileIdV1(fileId: number, companyId?: number): string {
  const companyIdStr = companyId ? `/${companyId}` : '1';
  return `/api/v1/company/${companyIdStr}/image/${fileId}`;
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
    // ToDo: (20250710 - Luphia) Use IPFS to store files
    const privateKey = await getPrivateKeyByCompany(companyId);

    if (!privateKey) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }
    const ivBuffer = Buffer.from(iv);
    const ivUint8Array = bufferToUint8Array(ivBuffer);

    let decryptedArrayBuffer: ArrayBuffer | null;
    try {
      decryptedArrayBuffer = await decryptFile(
        encryptedArrayBuffer,
        encryptedSymmetricKey,
        privateKey,
        ivUint8Array as BufferSource
      );
    } catch (error) {
      loggerBack.error(error, `Error in decryptImageFile in file.ts`);
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    if (!decryptedArrayBuffer) {
      loggerBack.error(`Decrypted array buffer is null in decryptImageFile in file.ts`);
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    decryptedBuffer = arrayBufferToBuffer(decryptedArrayBuffer);
  }

  return decryptedBuffer;
}

export async function encryptRoomFile({
  imageBuffer,
  publicKey,
}: {
  imageBuffer: Buffer;
  publicKey: CryptoKey;
}): Promise<{
  encryptedSymmetricKey: string;
  ivBuffer: Buffer;
  encryptedImageBuffer: Buffer;
}> {
  const imageArrayBuffer: ArrayBuffer = bufferToArrayBuffer(imageBuffer);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const { encryptedContent: encryptedImageArrayBuffer, encryptedSymmetricKey } = await encryptFile(
    imageArrayBuffer,
    publicKey,
    iv
  );
  const encryptedImageBuffer = arrayBufferToBuffer(encryptedImageArrayBuffer);
  const ivBuffer = uint8ArrayToBuffer(iv);
  return {
    encryptedSymmetricKey,
    ivBuffer,
    encryptedImageBuffer,
  };
}

/**
 * Info: (20241023 - Murky)
 * @description create a new IFileEntity object from scratch
 */
export function initFileEntity(
  dto: Partial<PrismaFile> & {
    name: string;
    size: number;
    mimeType: string;
    type: FileFolder;
    url: string;
    buffer?: Buffer;
    thumbnailId?: number | null;
    thumbnail?: IFileEntity;
  }
): IFileEntity {
  const nowInSecond = getTimestampNow();

  const fileEntity: IFileEntity = {
    id: dto.id || 0,
    name: dto.name,
    size: dto.size,
    mimeType: dto.mimeType,
    type: dto.type,
    url: dto.url,
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
    buffer: dto.buffer,
    thumbnailId: dto.thumbnailId || null,
    thumbnail: dto.thumbnail || undefined,
  };

  return fileEntity;
}

export async function writeBufferToFile({
  buffer,
  filePath,
}: {
  buffer: Buffer;
  filePath: string;
}): Promise<string | null> {
  try {
    // ToDo: (20250710 - Luphia) Use IPFS to store files (S2: 文件工具)
    await fs.writeFile(filePath, new Uint8Array(buffer.buffer));
  } catch (error) {
    loggerBack.error(error, `Error in writeBufferToFile in file.ts`);
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }
  return filePath;
}
