import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { ICompany } from '@/interfaces/company';
import { formatApiResponse } from '@/lib/utils/common';
import { formatCompany } from '@/lib/utils/formatter/company.formatter';
import { formatUser } from '@/lib/utils/formatter/user.formatter';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<{ user: IUser; company: ICompany }>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: { user: IUser; company: ICompany } = {
    user: {} as IUser,
    company: {} as ICompany,
  };

  const session = await getSession(req, res);
  const { userId, companyId } = session || {};

  if (userId) {
    const getUser = await getUserById(userId);
    if (getUser) {
      payload.user = formatUser(getUser);
    }
  }

  if (companyId) {
    const getCompany = await getCompanyById(companyId);
    if (getCompany) {
      payload.company = formatCompany(getCompany);
    }
  }

  statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: { user: IUser; company: ICompany } }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<{ user: IUser; company: ICompany }>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: { user: IUser; company: ICompany } = { user: {} as IUser, company: {} as ICompany };
  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    // ToDo: (20240828 - Jacky) Use logger to log the error
    statusMessage = error.message;
    payload = { user: {} as IUser, company: {} as ICompany };
  } finally {
    // ToDo: (20240828 - Jacky) Use logger to log the request
    const { httpCode, result } = formatApiResponse<{ user: IUser; company: ICompany }>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
