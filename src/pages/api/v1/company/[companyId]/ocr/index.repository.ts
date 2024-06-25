import prisma from '@/client';
import { ProgressStatus } from '@/constants/account';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { timestampInSeconds } from '@/lib/utils/common';
import { Ocr } from '@prisma/client';

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
    // Depreciated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }

  if (!company) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  return company;
}

// Todo: (20240625 - Jacky) Should change prisma to add type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function findManyOCRByCompanyIdWithoutUsedInPrisma(
  companyId: number,
  ocrtype: string = 'invoice'
) {
  let ocrData: Ocr[];

  try {
    ocrData = await prisma.ocr.findMany({
      where: {
        companyId,
        // ocrtype,
        status: {
          not: ProgressStatus.HAS_BEEN_USED,
        },
      },
    });
  } catch (error) {
    // Depreciated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
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
  }
) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  try {
    const ocrData = await prisma.ocr.create({
      data: {
        companyId,
        aichResultId: aichResult.resultStatus.resultId,
        imageName: aichResult.imageName,
        imageUrl: aichResult.imageUrl,
        imageSize: aichResult.imageSize,
        status: aichResult.resultStatus.status,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });

    return ocrData;
  } catch (error) {
    // Depreciated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}
