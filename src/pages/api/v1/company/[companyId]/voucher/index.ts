import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { ILineItem } from '@/interfaces/line_item';

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

async function findUniqueJournalInPrisma(journalId: number | undefined) {
  try {
    const result = await prisma.journal.findUnique({
      where: {
        id: journalId,
      },
      select: {
        id: true,
      },
    });

    if (!result) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    return result.id;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

async function findFirstAccountInPrisma(accountName: string) {
  try {
    const result = await prisma.account.findFirst({
      where: {
        name: accountName,
      },
      select: {
        id: true,
      },
    });

    return result?.id || null;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

// Deprecated: (20240527 - Murky) This function is for demo purpose only
async function createFakeAccountInPrisma() {
  try {
    const result = await prisma.account.create({
      data: {
        type: 'expense',
        liquidity: true,
        account: '其他費用',
        code: '0100032',
        name: '其他費用',
      },
      select: {
        id: true,
      },
    });

    return result.id;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

async function createLineItemInPrisma(lineItem: ILineItem) {
  try {
    let accountId = await findFirstAccountInPrisma(lineItem.account);

    // Deprecated: (20240527 - Murky) This is for demo purpose only
    if (!accountId) {
      accountId = await findFirstAccountInPrisma('其他費用');
      if (!accountId) {
        accountId = await createFakeAccountInPrisma();
      }
    }

    const result = await prisma.lineItem.create({
      data: {
        accountId,
        description: lineItem.description,
        debit: lineItem.debit,
        amount: lineItem.amount,
      },
      select: {
        id: true,
      },
    });

    return result.id;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

async function getLatestVoucherNoInPrisma(companyId: number) {
  try {
    const result = await prisma.voucher.findFirst({
      where: {
        journal: {
          companyId,
        },
      },
      orderBy: {
        no: 'desc',
      },
      select: {
        no: true,
        createdAt: true,
      },
    });

    const localToday = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`;
    const localTodayStrip = localToday.replace(/\//g, '');
    const isYesterday = result?.createdAt?.getDate() !== new Date().getDate();
    const latestNo = result?.no.slice(result.no.length - 3) || '0'; // Info: （ 20240522 - Murky）I want to slice the last 3 digits
    const newVoucherNo = isYesterday ? '001' : String(Number(latestNo) + 1).padStart(3, '0');

    return `${localTodayStrip}${newVoucherNo}`;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

async function createVoucherInPrisma(
  newVoucherNo: string,
  journalId: number,
  lineItemIds: number[]
) {
  try {
    const voucherData = await prisma.voucher.create({
      data: {
        no: newVoucherNo,
        journal: {
          connect: {
            id: journalId,
          },
        },
        lineItems: {
          connect: lineItemIds.map((lineItemId) => ({
            id: lineItemId,
          })),
        },
      },
      select: {
        id: true,
        lineItems: true,
      },
    });

    return voucherData;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

async function handleVoucherCreatePrismaLogic(voucher: IVoucherDataForSavingToDB) {
  try {
    const result = await prisma.$transaction(async () => {
      const journalId = await findUniqueJournalInPrisma(voucher.journalId);

      const lineItemIds = await Promise.all(
        voucher.lineItems.map(async (lineItem) => {
          return createLineItemInPrisma(lineItem);
        })
      );

      const newVoucherNo = await getLatestVoucherNoInPrisma(journalId);

      const voucherData = await createVoucherInPrisma(newVoucherNo, journalId, lineItemIds);

      return voucherData;
    });
    return result;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

function isVoucherValid(
  voucher: IVoucherDataForSavingToDB
): voucher is IVoucherDataForSavingToDB & { journalId: number } {
  if (
    !voucher ||
    !isIVoucherDataForSavingToDB(voucher) ||
    !voucher.journalId ||
    typeof voucher.journalId !== 'number'
  ) {
    return false;
  }
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  try {
    if (req.method === 'POST') {
      const { voucher } = req.body;

      // Info: （ 20240522 - Murky）body need to provide LineItems and journalId
      if (!isVoucherValid(voucher)) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }

      const result = await handleVoucherCreatePrismaLogic(voucher);

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
