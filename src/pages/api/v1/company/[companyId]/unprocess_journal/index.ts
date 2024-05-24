import type { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { ProgressStatus } from '@/constants/account';
import { IUnprocessedJournal } from '@/interfaces/journal';
import { AVERAGE_OCR_PROCESSING_TIME } from '@/constants/ocr';
import { AICH_URI } from '@/constants/config';

async function getUnprocessJournal(companyId: number) {
  try {
    // ToDo: (20240521 - Murky) 這個Query在重複使用下可能會佔用大量資源，需要進行優化 (ex : 使用Cache)
    const journalDatas = await prisma.journal.findMany({
      where: {
        companyId,
        invoiceId: null,
        voucherId: null,
      },
      select: {
        id: true,
        aichResultId: true,
        createdAt: true,
        ocr: {
          select: {
            imageName: true,
            imageUrl: true,
            imageSize: true,
            createdAt: true,
          },
        },
      },
    });

    const journals = journalDatas.filter(

      // prettier-ignore
      (journalData):journalData is typeof journalData & { ocr: NonNullable<typeof journalData.ocr> } => journalData.ocr !== null
);
    return journals;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASRE_READ_FAILED_ERROR);
  }
}

function calculateProgress(createdAt: Date, status: ProgressStatus) {
  const currentTime = new Date();
  const diffTime = currentTime.getTime() - createdAt.getTime();
  let process = Math.ceil((diffTime / AVERAGE_OCR_PROCESSING_TIME) * 100);

  if (process > 99) {
    process = 99;
  }

  if (status === ProgressStatus.SUCCESS) {
    process = 100;
  }
  return process;
}

async function fetchStatus(aichResultId: string) {
  try {
    const result = await fetch(`${AICH_URI}/api/v1/ocr/${aichResultId}/process_status`);

    if (!result.ok) {
      throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
    }

    const status: ProgressStatus = (await result.json()).payload;
    return status;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUnprocessedJournal[]>>
) {
  try {
    switch (req.method) {
      case 'GET': {
        const { companyId } = req.query;

        // Info Murky (20240416): Check if companyId is string
        if (
          Array.isArray(companyId) ||
          !companyId ||
          typeof companyId !== 'string' ||
          !Number.isInteger(Number(companyId))
        ) {
          throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
        }

        const companyIdNumber = Number(companyId);

        const journalDatas = await getUnprocessJournal(companyIdNumber);

        const unprocessJournals: IUnprocessedJournal[] = await Promise.all(
          // Info: update by tzuhan for npm run build checked 需要 Murky 協助更新 (20240523 - Tzuhan)
          journalDatas.map(async (journalData) => {
            const aichResultId = journalData.aichResultId as string;
            const status = await fetchStatus(aichResultId);
            const progress = calculateProgress(journalData.ocr.createdAt, status);
            const result = {
              id: journalData.id,
              aichResultId: journalData.aichResultId,
              imageName: journalData.ocr.imageName,
              imageUrl: journalData.ocr.imageUrl,
              imageSize: `${journalData.ocr.imageSize} KB`,
              progress,
              status,
              createdAt: timestampInSeconds(journalData.createdAt.getTime()),
            } as IUnprocessedJournal;
            return result;
          })
        );

        const { httpCode, result } = formatApiResponse<IUnprocessedJournal[]>(
          STATUS_MESSAGE.SUCCESS_GET,
          unprocessJournals
        );
        res.status(httpCode).json(result);

        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUnprocessedJournal[]>(error.message, []);
    res.status(httpCode).json(result);
  }
}
