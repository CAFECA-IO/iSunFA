import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { ILineItem } from '@/interfaces/line_item';
import { checkAdmin } from '@/lib/utils/auth_check';
import { AccountSystem, AccountType } from '@/constants/account';

type ApiResponseType = {
  id: number;
  createdAt: number;
  updatedAt: number;
  journalId: number;
  no: string;
  lineItems: {
      id: number;
      amount: number;
      description: string;
      debit: boolean;
      accountId: number;
      voucherId: number;
      createdAt: number;
      updatedAt: number;
  }[];
} | null;

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
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

async function findUniqueVoucherInPrisma(voucherId: number) {
  let voucherData:{
    id: number;
    createdAt: number;
    updatedAt: number;
    journalId: number;
    no: string;
    lineItems: {
        id: number;
        amount: number;
        description: string;
        debit: boolean;
        accountId: number;
        voucherId: number;
        createdAt: number;
        updatedAt: number;
    }[];
  } | null = null;
  try {
    voucherData = await prisma.voucher.findUnique({
      where: {
        id: voucherId,
      },
      select: {
        id: true,
        journalId: true,
        no: true,
        createdAt: true,
        updatedAt: true,
        lineItems: true,
      },
    });
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return voucherData;
}

// Deprecated: (20240527 - Murky) This function is for demo purpose only
async function createFakeAccountInPrisma(companyId: number) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  try {
    const result = await prisma.account.create({
      data: {
        company: {
          connect: {
            id: companyId,
          },
        },
        system: AccountSystem.IFRS,
        type: AccountType.EXPENSE,
        debit: true,
        liquidity: true,
        code: '0100032',
        name: '其他費用',
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },

      select: {
        id: true,
      },
    });

    return result.id;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

async function createLineItemInPrisma(lineItem: ILineItem, voucherId: number, companyId: number) {
  try {
    let accountId = await findFirstAccountInPrisma(lineItem.account);

    // Deprecated: (20240527 - Murky) This is for demo purpose only
    if (!accountId) {
      accountId = await findFirstAccountInPrisma('其他費用');
      if (!accountId) {
        accountId = await createFakeAccountInPrisma(companyId);
      }
    }
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    const result = await prisma.lineItem.create({
      data: {
        amount: lineItem.amount,
        description: lineItem.description,
        debit: lineItem.debit,
        account: {
          connect: {
            id: accountId,
          },
        },
        voucher: {
          connect: {
            id: voucherId,
          },
        },
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      select: {
        id: true,
      },
    });

    return result.id;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
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

    const resultDate = result?.createdAt ? new Date(timestampInSeconds(result?.createdAt)).getDate() : -1;
    const isYesterday = resultDate !== new Date().getDate();
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
) {
  try {
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    const voucherData = await prisma.voucher.create({
      data: {
        no: newVoucherNo,
        journal: {
          connect: {
            id: journalId,
          },
        },
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
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

async function handleVoucherCreatePrismaLogic(voucher: IVoucherDataForSavingToDB, companyId: number) {
  try {
    const journalId = await findUniqueJournalInPrisma(voucher.journalId);

    const newVoucherNo = await getLatestVoucherNoInPrisma(companyId);
    const voucherData = await createVoucherInPrisma(newVoucherNo, journalId);
    await Promise.all(
      voucher.lineItems.map(async (lineItem) => {
        return createLineItemInPrisma(lineItem, voucherData.id, companyId);
      })
    );

    // Info: （ 20240613 - Murky）Get the voucher data again after creating the line items
    const voucherWithLineItems = await findUniqueVoucherInPrisma(voucherData.id);

    return voucherWithLineItems;
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

export async function handlePostRequest(req: NextApiRequest, companyId: number) {
  const { voucher } = req.body;

  // Info: （ 20240522 - Murky）body need to provide LineItems and journalId
  if (!isVoucherValid(voucher)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const result = await handleVoucherCreatePrismaLogic(voucher, companyId);

  const { httpCode, result: response } = formatApiResponse<ApiResponseType>(
    STATUS_MESSAGE.CREATED,
    result
  );

  return { httpCode, response };
}

export function handleErrorRequest(error: Error) {
  const { httpCode, result } = formatApiResponse<ApiResponseType>(
    error.message,
    {} as ApiResponseType
  );
  return { httpCode, result };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  const session = await checkAdmin(req, res);
  const { companyId } = session;
  // Depreciated: (20240613 - Murky) Need to replace by type guard after merge
  if (!companyId || typeof companyId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  try {
    if (req.method === 'POST') {
      const { httpCode, response } = await handlePostRequest(req, companyId);
      res.status(httpCode).json(response);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = handleErrorRequest(error);
    res.status(httpCode).json(result);
  }
}
