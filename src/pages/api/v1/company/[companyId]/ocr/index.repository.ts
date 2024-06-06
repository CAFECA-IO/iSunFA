import prisma from "@/client";
import { ProgressStatus } from "@/constants/account";
import { STATUS_MESSAGE } from "@/constants/status_code";
import { IAccountResultStatus } from "@/interfaces/accounting_account";
import { timestampInSeconds } from "@/lib/utils/common";
import { Journal } from "@prisma/client";

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
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }

  if (!company) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
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

export async function createJournalInPrisma(
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
    const newJournal = await prisma.journal.create({
      data: {
        companyId,
        ocrId,
        aichResultId: aichResult.resultStatus.resultId,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
    });

    return newJournal;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

export async function createJournalAndOcrInPrisma(
  companyId: number,
  aichResult: {
    resultStatus: IAccountResultStatus;
    imageUrl: string;
    imageName: string;
    imageSize: number;
  }
) {
  // ToDo: (20240521 - Murky) companyId 要檢查是否存在該公司
  // ToDo: (20240521 - Murky) 重複的圖片一直post貌似會越來越多Journal? 目前沒有檢查重複post的狀況
  // 如果是AICH已經重複的就不建立了
  if (aichResult.resultStatus.status !== ProgressStatus.IN_PROGRESS) {
    throw new Error(STATUS_MESSAGE.OCR_PROCESS_STATUS_IS_NOT_IN_PROGRESS);
  }
  let journal: Journal;

  try {
    // ToDo (20240605 - Murky) 改版後這裡不應該要有transaction, 並且不要有OCR
    journal = await prisma.$transaction(async () => {
      const company = await findUniqueCompanyInPrisma(companyId);
      const ocrData = await createOcrInPrisma(aichResult);
      const newJournal = await createJournalInPrisma(company.id, aichResult, ocrData.id);
      return newJournal;
    });
  } catch (error) {
    // Depreciated (20240621 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return journal;
}
