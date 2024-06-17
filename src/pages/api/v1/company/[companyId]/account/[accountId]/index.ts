import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric } from '@/lib/utils/common';
import prisma from '@/client';
import type { Account } from '@prisma/client';
import { checkAdmin } from '@/lib/utils/auth_check';
import { PUBLIC_COMPANY_ID } from '@/constants/company';

export function formatParams(
  companyId: unknown,
  accountId: string | string[] | undefined
) {
  // ToDo: (20240613 - Murky) - need to use type guard instead
  const isCompanyIdValid = !Number.isNaN(Number(companyId));
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

export async function findFirstAccountInPrisma(accountId: number, companyId: number) {
  let account: Account | null;
  try {
    account = await prisma.account.findFirst({
      where: {
        id: accountId,
        OR: [
          {
            companyId,
          },
          {
            companyId: PUBLIC_COMPANY_ID,
          },
        ]
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
    companyId: account.companyId,
    system: account.system,
    type: account.type,
    liquidity: account.liquidity,
    debit: account.debit,
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
  const session = await checkAdmin(req, res);
  const { companyId } = session;
  const { accountId } = req.query;
  const { accountIdNumber, companyIdNumber } = formatParams(companyId, accountId);
  const accountFromDb = await findFirstAccountInPrisma(accountIdNumber, companyIdNumber);
  const account = formatAccounts(accountFromDb);

  const { httpCode, result } = formatApiResponse<IAccount>(STATUS_MESSAGE.SUCCESS, account);
  return {
    httpCode,
    result,
  };
}

export function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IAccount>(message, {} as IAccount);
  return {
    httpCode,
    result,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount>>
) {
  try {
    if (req.method === 'GET') {
      const { httpCode, result } = await handleGetRequest(req, res);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;

    // Info Murky (20240416): Debugging
    // eslint-disable-next-line no-console
    console.error(error.message);
    const { httpCode, result } = handleErrorResponse(res, error.message);

    res.status(httpCode).json(result);
  }
}
