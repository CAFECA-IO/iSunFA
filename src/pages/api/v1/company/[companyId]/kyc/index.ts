import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompanyKYC } from '@/interfaces/company_kyc';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { createCompanyKYC } from '@/lib/utils/repo/company_kyc.repo';
import { isCompanyKYC, isCompanyKYCForm } from '@/lib/utils/type_guard/company_kyc';
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanyKYC>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanyKYC | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { body: companyKYCForm } = validateRequest(APIName.KYC_UPLOAD, req, userId);
      loggerBack.info({ userId, companyId, companyKYCForm });
      if (!isCompanyKYCForm(companyKYCForm)) {
        statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      } else {
        try {
          const companyKYC = await createCompanyKYC(companyId, companyKYCForm);
          if (!isCompanyKYC(companyKYC)) {
            statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
          } else {
            payload = companyKYC;
            statusMessage = STATUS_MESSAGE.CREATED;
          }
        } catch (error) {
          const logger = loggerError(
            userId,
            'post /api/v1/company/[companyId]/kyc',
            'Failed to create company KYC'
          );
          logger.error(error);
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        }
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<ICompanyKYC>>
  ) => Promise<{ statusMessage: string; payload: ICompanyKYC | null }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanyKYC | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanyKYC | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    // ToDo: (20240828 - Jacky) Log error message
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<ICompanyKYC | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
