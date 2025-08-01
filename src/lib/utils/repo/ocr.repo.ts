import prisma from '@/client';
import { ProgressStatus } from '@/constants/account';
import { ocrTypes } from '@/constants/ocr';
import { SortOrder } from '@/constants/sort';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { ocrIncludeFile } from '@/interfaces/ocr';
import { getTimestampNow } from '@/lib/utils/common';
import { File, Ocr, Prisma } from '@prisma/client';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

export async function findUniqueCompanyInPrisma(accountBookId: number) {
  let accountBook: {
    id: number;
  } | null;

  try {
    accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
      select: { id: true },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find unique company in findUniqueCompanyInPrisma failed',
      errorMessage: (error as Error).message,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }

  if (!accountBook) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  return accountBook;
}

export async function findManyOCRByCompanyIdWithoutUsedInPrisma(
  accountBookId: number,
  ocrType: ocrTypes = ocrTypes.INVOICE
): Promise<ocrIncludeFile[]> {
  let ocrData: ocrIncludeFile[] = [];

  const where: Prisma.OcrWhereInput = {
    accountBookId,
    type: ocrType,
    deletedAt: null,
    status: {
      not: ProgressStatus.HAS_BEEN_USED,
    },
  };

  const orderBy: Prisma.OcrOrderByWithRelationInput = {
    createdAt: SortOrder.ASC,
  };

  const include: Prisma.OcrInclude = {
    imageFile: true,
  };

  try {
    ocrData = await prisma.ocr.findMany({
      where,
      include,
      orderBy,
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find many ocr in findManyOCRByCompanyIdWithoutUsedInPrisma failed',
      errorMessage: (error as Error).message,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }

  return ocrData;
}

export async function getOcrByResultId(
  aichResultId: string,
  isDeleted?: boolean
): Promise<Ocr | null> {
  let ocrData: Ocr | null = null;

  if (aichResultId) {
    ocrData = await prisma.ocr.findUnique({
      where: {
        aichResultId,
        deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
      },
    });
  }

  return ocrData;
}

export async function createOcrInPrisma(
  accountBookId: number,
  resultStatus: IAccountResultStatus,
  type: string,
  fileId: number
): Promise<ocrIncludeFile | null> {
  const nowTimestamp = getTimestampNow();

  let ocrData: ocrIncludeFile | null = null;
  try {
    ocrData = await prisma.ocr.create({
      data: {
        accountBookId,
        aichResultId: resultStatus.resultId,
        status: resultStatus.status,
        type,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
        imageFileId: fileId,
      },
      include: {
        imageFile: true,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'create ocr in createOcrInPrisma failed',
      errorMessage: (error as Error).message,
    });
  }

  return ocrData;
}

export async function deleteOcrByResultId(
  aichResultId: string
): Promise<Ocr & { imageFile: File }> {
  const nowInSecond = getTimestampNow();
  const where: Prisma.OcrWhereUniqueInput = {
    aichResultId,
    deletedAt: null,
  };

  const data: Prisma.OcrUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const include = {
    imageFile: true,
  };

  const ocr = await prisma.ocr.update({
    where,
    data,
    include,
  });
  return ocr;
}
