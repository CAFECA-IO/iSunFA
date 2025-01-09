import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ICompany } from '@/interfaces/company';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getSession, setSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { formatCompany } from '@/lib/utils/formatter/company.formatter';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { NON_EXISTING_COMPANY_ID } from '@/constants/config';

async function handlePutRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompany | null = null;

  const companyIdNum = convertStringToNumber(req.query.companyId);
  const session = await getSession(req);
  const { userId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const getCompany = await getCompanyById(companyIdNum);
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      const companyId = getCompany ? companyIdNum : NON_EXISTING_COMPANY_ID;
      const company = getCompany ? formatCompany(getCompany) : null;
      await setSession(session, { companyId });
      payload = company;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICompany | null }>;
} = {
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompany | null = null;

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
    const { httpCode, result } = formatApiResponse<ICompany | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
