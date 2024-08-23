import prisma from '@/client';
import { ProgressStatus } from '@/constants/account';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Ocr, Prisma } from '@prisma/client';

export async function findUniqueCompanyInPrisma(companyId: number) {
  let company: {
    id: number;
  } | null;

  try {
    company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
  } catch (error) {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }

  if (!company) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  return company;
}

export async function findManyOCRByCompanyIdWithoutUsedInPrisma(
  companyId: number,
  ocrType: string = 'invoice'
): Promise<Ocr[]> {
  let ocrData: Ocr[];

  const where: Prisma.OcrWhereInput = {
    companyId,
    type: ocrType,
    deletedAt: null,
    status: {
      not: ProgressStatus.HAS_BEEN_USED,
    },
  };

  const orderBy: Prisma.OcrOrderByWithRelationInput = {
    createdAt: 'asc',
  };

  const findManyOptions: Prisma.OcrFindManyArgs = {
    where,
    orderBy,
  };

  try {
    ocrData = await prisma.ocr.findMany(findManyOptions);
  } catch (error) {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
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
  companyId: number,
  aichResult: {
    resultStatus: IAccountResultStatus;
    imageUrl: string;
    imageName: string;
    imageSize: number;
    type: string;
  }
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  let ocrData: Ocr | null = null;
  try {
    ocrData = await prisma.ocr.create({
      data: {
        companyId,
        aichResultId: aichResult.resultStatus.resultId,
        imageName: aichResult.imageName,
        imageUrl: aichResult.imageUrl,
        imageSize: aichResult.imageSize,
        status: aichResult.resultStatus.status,
        type: aichResult.type,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });
  } catch (error) {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
  }

  return ocrData;
}

export async function deleteOcrByResultId(aichResultId: string): Promise<Ocr> {
  const nowInSecond = getTimestampNow();
  const where: Prisma.OcrWhereUniqueInput = {
    aichResultId,
    deletedAt: null,
  };

  const data: Prisma.OcrUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const updatedArgs: Prisma.OcrUpdateArgs = {
    where,
    data,
  };
  const ocr = await prisma.ocr.update(updatedArgs);
  return ocr;
}
