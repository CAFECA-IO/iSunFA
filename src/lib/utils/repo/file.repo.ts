import prisma from '@/client';
import { FileDatabaseConnectionType, FileFolder } from '@/constants/file';
import { Prisma, File } from '@prisma/client';
import { getTimestampNow } from '@/lib/utils/common';
import loggerBack from '@/lib/utils/logger_back';

/**
 * Info: (20240830 - Murky)
 * This function is used to create a file record in the database.
 * @param name: string - The name of the file.
 * @param accountBookId: number - The id of the company that the file connect to.
 * @param size: number - The size of the file, it's bytes.
 * @param mimeType: string - The mime type of the file. ex: image/png
 * @param type: FileFolder - The type of the file store in local Folder. ex: FileFolder.TMP if not store in local
 * @param url: string - The url of the file. it can be local path or cloud storage path.
 * @param isEncrypted: boolean - The flag to indicate the file is encrypted by encryptSymmetricKey or not.
 * @param encryptSymmetricKey: string - The symmetric key to encrypt the file.
 * @returns File | null - The file record that created in the database.
 */
export async function createFile({
  name,
  size,
  mimeType,
  type,
  url,
  isEncrypted,
  encryptedSymmetricKey,
  iv,
}: {
  name: string;
  size: number;
  mimeType: string;
  type: FileFolder;
  url: string;
  isEncrypted: boolean;
  encryptedSymmetricKey: string;
  iv?: Buffer;
}) {
  const nowInSecond = getTimestampNow();

  const fileData: Prisma.FileCreateInput = {
    name,
    size,
    mimeType,
    type,
    url,
    isEncrypted,
    encryptedSymmetricKey,
    iv,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };

  let file: File | null = null;

  try {
    file = await prisma.file.create({
      data: fileData,
    });
  } catch (error) {
    loggerBack.error(`Error happened in createFile in file.repo.ts`);
    loggerBack.error(error);
  }
  return file;
}

/**
 * Info: (20240830 - Murky)
 * This function is used to connect a file record to another record in the database.
 * @param connectTo: FileDatabaseConnectionType - The type of the record that the file will connect to.
 * @returns File | null - The file record that connected to the record.
 */
export async function connectFileById(
  connectTo: FileDatabaseConnectionType,
  fileId: number,
  connectToId: number
) {
  const connectFile: Prisma.FileWhereUniqueInput = {
    id: connectToId,
  };

  const connectData: Prisma.FileUpdateInput = {
    [connectTo]: {
      connect: connectFile,
    },
  } as Prisma.FileUpdateInput; // Info: (20240830 - Murky) 使用as 可以避免TypeScript 可能會對動態鍵值訪問（即 [connectTo]: 這種語法）進行編譯時檢查

  let file: File | null = null;

  try {
    file = await prisma.file.update({
      where: {
        id: fileId,
      },
      data: connectData,
    });
  } catch (error) {
    loggerBack.error(`Error happened in connectFileById in file.repo.ts`);
    loggerBack.error(error);
  }
  return file;
}

export async function findFileById(fileId: number): Promise<File | null> {
  let file: File | null = null;

  try {
    file = await prisma.file.findFirst({
      where: {
        id: fileId,
      },
    });
  } catch (error) {
    loggerBack.error(`Error happened in findFileById in file.repo.ts`);
    loggerBack.error(error);
  }
  return file;
}

export async function findFileWithThumbnailById(fileId: number): Promise<File | null> {
  let file: File | null = null;

  try {
    file = await prisma.file.findFirst({
      where: {
        id: fileId,
      },
      include: {
        thumbnail: true,
      },
    });
  } catch (error) {
    loggerBack.error(`Error happened in findFileById in file.repo.ts`);
    loggerBack.error(error);
  }
  return file;
}

export async function putFileById(fileId: number, options: Partial<File>): Promise<File | null> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.FileWhereUniqueInput = {
    id: fileId,
  };

  const data: Prisma.FileUpdateInput = {
    ...options,
    updatedAt: nowInSecond,
  };

  let file: File | null = null;

  try {
    file = await prisma.file.update({
      where,
      data,
    });
  } catch (error) {
    loggerBack.error(`Error happened in putFileById in file.repo.ts`);
    loggerBack.error(error);
  }

  return file;
}

export async function listFileByIdList(fileIdList: number[]): Promise<File[]> {
  let files: File[] = [];

  try {
    files = await prisma.file.findMany({
      where: {
        id: {
          in: fileIdList,
        },
      },
      include: {
        thumbnail: true,
      },
    });
  } catch (error) {
    loggerBack.error(`Error happened in listFileByIdList in file.repo.ts`);
    loggerBack.error(error);
  }
  return files;
}

export async function findFileInDBByName(name: string): Promise<File | null> {
  let file: File | null = null;

  try {
    file = await prisma.file.findFirst({
      where: {
        name,
      },
      include: {
        thumbnail: true,
      },
    });
  } catch (error) {
    loggerBack.error(`Error happened in findFileByName in file.repo.ts`);
    loggerBack.error(error);
  }
  return file;
}

export async function deleteFileById(fileId: number) {
  const nowInSecond = getTimestampNow();

  const where: Prisma.FileWhereUniqueInput = {
    id: fileId,
  };

  const data: Prisma.FileUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  let file: File | null = null;
  try {
    file = await prisma.file.update({
      where,
      data,
    });
  } catch (error) {
    loggerBack.error(`Error happened in deleteFileById in file.repo.ts`);
    loggerBack.error(error);
  }

  return file;
}

export async function deleteFileByName(name: string) {
  const nowInSecond = getTimestampNow();

  const where: Prisma.FileWhereInput = {
    name,
  };

  const data: Prisma.FileUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  let file: Prisma.BatchPayload | null = null;

  try {
    file = await prisma.file.updateMany({
      where,
      data,
    });
  } catch (error) {
    loggerBack.error(`Error happened in deleteFileByName in file.repo.ts`);
    loggerBack.error(error);
  }

  return file;
}

export async function deleteFileByIdForTesting(fileId: number) {
  const where: Prisma.FileWhereUniqueInput = {
    id: fileId,
  };

  let file: File | null = null;
  try {
    file = await prisma.file.delete({
      where,
    });
  } catch (error) {
    loggerBack.error(`Error happened in deleteFileByIdForTest in file.repo.ts`);
    loggerBack.error(error);
  }

  return file;
}
