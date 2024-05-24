import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';

import { STATUS_MESSAGE } from '@/constants/status_code';

async function saveVoucherToDB(voucher: IVoucherDataForSavingToDB) {
  try {
    const result = await prisma.$transaction(async () => {
      const journal = await prisma.journal.findUniqueOrThrow({
        where: {
          id: voucher.journalId,
        },
        select: {
          id: true,
        },
      });
      const fakeAccount = await prisma.account.create({
        data: {
          type: 'FAKE',
          liquidity: 'FAKE',
          account: 'FAKE',
          code: 'FAKE',
          name: 'FAKE',
        },
        select: {
          id: true,
        },
      });

      const lineItems = await Promise.all(voucher.lineItems.map(async (lineItem) => {
        return prisma.lineItem.create({
          data: {
            accountId: fakeAccount.id,
            description: lineItem.description,
            debit: lineItem.debit,
            amount: lineItem.amount,
          },
          select: {
            id: true,
          }
        });
      }));

      const voucherData = await prisma.voucher.create({
        data: {
          no: "Fake",
          journal: {
            connect: {
              id: journal.id,
            },
          },
          lineItems: {
            connect: lineItems.map((lineItem) => ({
              id: lineItem.id,
            })),
          },
        },
        select: {
          id: true,
          lineItems: true
        }
      });

      return voucherData;
    });
    return result;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

type ApiResponseType = {
  id: number;
  lineItems: {
      id: number;
      amount: number;
      description: string;
      debit: boolean;
      accountId: number;
      voucherId: number | null;
  }[];
};
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  try {
    if (req.method === 'POST') {
      const voucher = req.body;

      // Info: （ 20240522 - Murkky）body need to provide LineItems and journalId
      if (!voucher || !isIVoucherDataForSavingToDB(voucher) || !(voucher.journalId)) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }

      const result = await saveVoucherToDB(voucher);

      const { httpCode, result: response } = formatApiResponse<ApiResponseType>(
        STATUS_MESSAGE.CREATED,
        result
      );

      res.status(httpCode).json(response);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;

    const { httpCode, result } = formatApiResponse<ApiResponseType>(
      error.message,
      {} as ApiResponseType
    );
    res.status(httpCode).json(result);
  }
}
