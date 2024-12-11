import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { putCompanyIcon } from '@/lib/utils/repo/company.repo';

import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { loggerError } from '@/lib/utils/logger_back';
import { Company, File } from '@prisma/client';
import { ICompany } from '@/interfaces/company';

const handlePutRequest: IHandleRequest<
  APIName.COMPANY_PUT_ICON,
  Company & { imageFile: File }
> = async ({ query, body, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: (Company & { imageFile: File }) | null = null;

  const { companyId } = query;
  const { fileId } = body;
  const { userId } = session;

  try {
    const updatedCompany = await putCompanyIcon({ companyId, fileId });
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = updatedCompany;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICompany | null }>;
} = {
  PUT: (req, res) => withRequestValidation(APIName.COMPANY_PUT_ICON, req, res, handlePutRequest),
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
