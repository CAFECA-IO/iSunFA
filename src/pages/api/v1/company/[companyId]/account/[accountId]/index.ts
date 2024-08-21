import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatAccount } from '@/lib/utils/formatter/account.formatter';
import {
  findFirstAccountInPrisma,
  updateAccountInPrisma,
  softDeleteAccountInPrisma,
} from '@/lib/utils/repo/account.repo';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';

function formatParams(companyId: unknown, accountId: string | string[] | undefined) {
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

async function getCompanyIdAccountId(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const { accountId } = req.query;
  const { accountIdNumber, companyIdNumber } = formatParams(companyId, accountId);
  return {
    companyIdNumber,
    accountIdNumber,
  };
}

export async function handleGetRequest(companyIdNumber: number, accountIdNumber: number) {
  const accountFromDb = await findFirstAccountInPrisma(accountIdNumber, companyIdNumber);
  const account = accountFromDb ? formatAccount(accountFromDb) : ({} as IAccount);
  const { httpCode, result } = formatApiResponse<IAccount>(STATUS_MESSAGE.SUCCESS, account);
  return {
    httpCode,
    result,
  };
}

async function handlePutRequest(companyIdNumber: number, accountIdNumber: number, name: string) {
  const updatedAccount = await updateAccountInPrisma(accountIdNumber, companyIdNumber, name);
  const account = updatedAccount ? formatAccount(updatedAccount) : ({} as IAccount);
  const { httpCode, result } = formatApiResponse<IAccount>(STATUS_MESSAGE.SUCCESS_UPDATE, account);
  return {
    httpCode,
    result,
  };
}

async function handleDeleteRequest(companyIdNumber: number, accountIdNumber: number) {
  const deletedAccount = await softDeleteAccountInPrisma(accountIdNumber, companyIdNumber);
  const account = deletedAccount ? formatAccount(deletedAccount) : ({} as IAccount);
  const { httpCode, result } = formatApiResponse<IAccount>(STATUS_MESSAGE.SUCCESS_DELETE, account);
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
    const { companyIdNumber, accountIdNumber } = await getCompanyIdAccountId(req, res);
    if (req.method === 'GET') {
      const { httpCode, result } = await handleGetRequest(companyIdNumber, accountIdNumber);
      res.status(httpCode).json(result);
    } else if (req.method === 'PUT') {
      const { name } = req.body;
      const { httpCode, result } = await handlePutRequest(companyIdNumber, accountIdNumber, name);
      res.status(httpCode).json(result);
    } else if (req.method === 'DELETE') {
      const { httpCode, result } = await handleDeleteRequest(companyIdNumber, accountIdNumber);
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
