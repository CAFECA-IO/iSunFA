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
import { IAccountBook } from '@/interfaces/account_book';

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

    const formattedPayload = {
      ...updatedCompany,
      imageId: updatedCompany.imageFile?.id.toString() || '',
    };

    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = formattedPayload as Company & { imageFile: File };
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
  ) => Promise<{ statusMessage: string; payload: IAccountBook | null }>;
} = {
  PUT: (req) => withRequestValidation(APIName.COMPANY_PUT_ICON, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBook | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

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
    const { httpCode, result } = formatApiResponse<IAccountBook | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
