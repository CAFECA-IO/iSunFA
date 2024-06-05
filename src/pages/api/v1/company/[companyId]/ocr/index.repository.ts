import prisma from "@/client";
import { STATUS_MESSAGE } from "@/constants/status_code";
import { IAccountResultStatus } from "@/interfaces/accounting_account";
import { timestampInSeconds } from "@/lib/utils/common";

export async function createOrFindCompanyInPrisma(companyId: number) {
  let company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    try {
      const now = Date.now();
      const nowTimestamp = timestampInSeconds(now);
      company = await prisma.company.create({
        data: {
          id: companyId,
          code: 'TEST_OCR',
          name: 'Company Name',
          regional: 'Regional Name',
          startDate: nowTimestamp,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        },
        select: { id: true },
      });
    } catch (error) {
      throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
    }
  }

  return company;
}

export async function createOcrInPrisma(aichResult: {
  resultStatus: IAccountResultStatus;
  imageUrl: string;
  imageName: string;
  imageSize: number;
}) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  try {
    const ocrData = await prisma.ocr.create({
      data: {
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
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

export async function upsertJournalInPrisma(
  companyId: number,
  aichResult: {
    resultStatus: IAccountResultStatus;
    imageUrl: string;
    imageName: string;
    imageSize: number;
  },
  ocrId: number
) {
  try {
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    await prisma.journal.upsert({
      where: {
        aichResultId: aichResult.resultStatus.resultId,
      },
      create: {
        companyId,
        ocrId,
        aichResultId: aichResult.resultStatus.resultId,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      update: {
        ocrId,
      },
    });
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}
