import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric } from '@/lib/utils/common';
import prisma from '@/client';
import type { Account } from '@prisma/client';

export function formatParams(
  companyId: string | string[] | undefined,
  accountId: string | string[] | undefined
) {
  const isCompanyIdValid = isParamNumeric(companyId);
  const isAccountIdValid = isParamNumeric(accountId);

  if (!(isCompanyIdValid && isAccountIdValid)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const companyIdNumber = Number(companyId);
  const accountIdNumber = Number(accountId);
  return {
    companyIdNumber,
    accountIdNumber,
  };
}

export async function getAccountInPrisma(accountId: number) {
  let account: Account | null;
  try {
    account = await prisma.account.findFirst({
      where: {
        id: accountId,
      },
    });
  } catch (error) {
    // Info (20240516 - Murky) - Debugging error
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }

  if (!account) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  return account;
}

export function formatAccounts(account: Account): IAccount {
  return {
    id: account.id,
    type: account.type,
    liquidity: account.liquidity,
    account: account.account,
    code: account.code,
    name: account.name,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount>>
) {
  const { companyId, accountId } = req.query;
  const { accountIdNumber } = formatParams(companyId, accountId);
  const accountFromDb = await getAccountInPrisma(accountIdNumber);
  const account = formatAccounts(accountFromDb);

  const { httpCode, result } = formatApiResponse<IAccount>(STATUS_MESSAGE.SUCCESS, account);
  res.status(httpCode).json(result);
}

export function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IAccount>(message, {} as IAccount);
  res.status(httpCode).json(result);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount>>
) {
  try {
    if (req.method === 'GET') {
      await handleGetRequest(req, res);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;

    // Info Murky (20240416): Debugging
    // eslint-disable-next-line no-console
    console.error(error.message);
    handleErrorResponse(res, error.message);
  }
}
