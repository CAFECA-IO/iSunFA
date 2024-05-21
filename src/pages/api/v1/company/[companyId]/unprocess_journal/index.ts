import type { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { ProgressStatus } from '@/constants/account';
import { IUnprocessedJournal } from '@/interfaces/journal';

async function getUnprocessJournal(companyId: number) {
  try {
    const journalDatas = await prisma.journal.findMany({
      where: {
        companyId,
        invoiceId: null,
        voucherId: null,
      },
      select: {
        id: true,
        ocr: { select: {
          imageName: true,
          imageUrl: true,
          imageSize: true,
          createdAt: true,
        } },
      },
    });
    return journalDatas;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASRE_READ_FAILED_ERROR);
  }
}

export default async function handler(

  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUnprocessedJournal[]>>
) {
  try {
    switch (req.method) {
      case 'POST': {
        const { companyId } = req.query;

        // Info Murky (20240416): Check if companyId is string
        if (Array.isArray(companyId) || !companyId || typeof companyId !== 'string' || !Number.isInteger(Number(companyId))) {
          throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
        }

        const companyIdNumber = Number(companyId);

        const journalDatas = await getUnprocessJournal(companyIdNumber);

        break;
      } default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IUnprocessedJournal[]>(error.message, []);
    res.status(httpCode).json(result);
  }
}
