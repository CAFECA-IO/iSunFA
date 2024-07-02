import type { NextApiRequest, NextApiResponse } from 'next';
import { IAccount } from '@/interfaces/accounting_account';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, isParamNumeric } from '@/lib/utils/common';
import { checkAdmin } from '@/lib/utils/auth_check';
import { formatAccount } from '@/lib/utils/formatter/account.formatter';
import { findFirstAccountInPrisma } from '@/lib/utils/repo/account.repo';

export function formatParams(companyId: unknown, accountId: string | string[] | undefined) {
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

export async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount>>
) {
  const session = await checkAdmin(req, res);
  const { companyId } = session;
  const { accountId } = req.query;
  const { accountIdNumber, companyIdNumber } = formatParams(companyId, accountId);
  const accountFromDb = await findFirstAccountInPrisma(accountIdNumber, companyIdNumber);
  const account = accountFromDb ? formatAccount(accountFromDb) : ({} as IAccount);

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
