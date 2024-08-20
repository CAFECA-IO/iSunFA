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
  if (!userId) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
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

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccount | null = null;

  const { companyIdNumber, accountIdNumber } = await getCompanyIdAccountId(req, res);
  const accountFromDb = await findFirstAccountInPrisma(accountIdNumber, companyIdNumber);
  const account = accountFromDb ? formatAccount(accountFromDb) : ({} as IAccount);
  statusMessage = STATUS_MESSAGE.SUCCESS;
  payload = account;

  return { statusMessage, payload };
}

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccount | null = null;

  const { companyIdNumber, accountIdNumber } = await getCompanyIdAccountId(req, res);
  const { name } = req.body;
  const updatedAccount = await updateAccountInPrisma(accountIdNumber, companyIdNumber, name);
  const account = updatedAccount ? formatAccount(updatedAccount) : ({} as IAccount);
  statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  payload = account;

  return { statusMessage, payload };
}

async function handleDeleteRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccount | null = null;

  const { companyIdNumber, accountIdNumber } = await getCompanyIdAccountId(req, res);
  const deletedAccount = await softDeleteAccountInPrisma(accountIdNumber, companyIdNumber);
  const account = deletedAccount ? formatAccount(deletedAccount) : ({} as IAccount);
  statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
  payload = account;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAccount | null }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccount | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccount | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IAccount | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
