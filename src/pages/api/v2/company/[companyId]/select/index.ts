import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ICompany } from '@/interfaces/company';
import { formatApiResponse } from '@/lib/utils/common';
import { setSession } from '@/lib/utils/session';
import { formatCompany } from '@/lib/utils/formatter/company.formatter';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { getCompanyAndRoleByUserIdAndCompanyId } from '@/lib/utils/repo/admin.repo';

const handlePutRequest: IHandleRequest<APIName.COMPANY_SELECT, ICompany> = async ({
  query,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompany | null = null;

  const { companyId } = query;
  const { userId } = session;

  const getCompanyAndRole = await getCompanyAndRoleByUserIdAndCompanyId(userId, companyId);
  if (getCompanyAndRole) {
    const company = formatCompany(getCompanyAndRole.company);
    await setSession(session, { companyId });
    statusMessage = STATUS_MESSAGE.SUCCESS;
    payload = company;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICompany | null }>;
} = {
  PUT: (req, res) => withRequestValidation(APIName.COMPANY_SELECT, req, res, handlePutRequest),
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
