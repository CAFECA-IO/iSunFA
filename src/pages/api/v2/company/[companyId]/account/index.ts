import { APIName } from '@/constants/api_connection';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IResponseData } from '@/interfaces/response_data';
import AccountRetrieverFactory from '@/lib/utils/account/account_retriever_factory';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { withRequestValidation } from '@/lib/utils/middleware';
import { NextApiRequest, NextApiResponse } from 'next';
import { accountAPIPostUtils as postUtils } from '@/pages/api/v2/company/[companyId]/account/route_utils';

export const handleGetRequest: IHandleRequest<
  APIName.ACCOUNT_LIST,
  IPaginatedAccount | null
> = async ({ query, session }) => {
  const { companyId, userId } = session;
  let payload: IPaginatedAccount | null = null;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const {
    includeDefaultAccount,
    liquidity,
    type,
    reportType,
    equityType,
    forUser,
    page,
    limit,
    sortBy,
    sortOrder,
    searchKey,
    isDeleted,
  } = query;

  try {
    const accountRetriever = AccountRetrieverFactory.createRetriever({
      companyId,
      includeDefaultAccount,
      liquidity,
      type,
      reportType,
      equityType,
      forUser,
      page,
      limit,
      sortBy,
      sortOrder,
      searchKey,
      isDeleted,
    });

    payload = await accountRetriever.getAccounts();
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  } catch (error) {
    const errorInfo = {
      userId,
      errorType: 'getAccounts failed',
      errorMessage: 'Func. getAccounts in company/companyId/account/index.ts failed',
    };
    loggerError(errorInfo);
  }
  return {
    statusMessage,
    payload,
  };
};

export const handlePostRequest: IHandleRequest<
  APIName.CREATE_NEW_SUB_ACCOUNT,
  IAccount | null
> = async ({ body, session }) => {
  const { companyId, userId } = session;
  const { accountId, name, note } = body;
  let payload: IAccount | null = null;
  const nowInSecond = getTimestampNow();
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  try {
    const parentAccount = await postUtils.getParentAccountFromPrisma({
      accountId,
      companyId,
    });

    const lastSubAccount = await postUtils.getLastSubAccountFromPrisma(parentAccount);
    const newCode = postUtils.getNewCode({
      parentAccount,
      latestSubAccount: lastSubAccount,
    });
    const newName = postUtils.getNewName({
      parentAccount,
      name,
    });

    const newSubAccount = await postUtils.createNewSubAccountInPrisma({
      parentAccount,
      nowInSecond,
      companyId,
      newCode,
      newName,
      note: note ?? '',
    });

    payload = newSubAccount;
    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (error) {
    const errorInfo = {
      userId,
      errorType: 'postAccounts failed',
      errorMessage: 'Func. postAccounts in company/companyId/account/index.ts failed',
    };
    loggerError(errorInfo);
  }
  return {
    statusMessage,
    payload,
  };
};

type APIResponse = IPaginatedAccount | IAccount | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.ACCOUNT_LIST, req, handleGetRequest),
  POST: (req) => withRequestValidation(APIName.CREATE_NEW_SUB_ACCOUNT, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  const userId = -1;
  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
