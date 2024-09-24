import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { mockCertificateList } from '@/pages/api/v2/company/[companyId]/certificate/service';
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';

type APIResponse = object | null;

export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: object | null = null;

  const session = await getSession(req, res);
  const { userId } = session;
  // ToDo: (20240924 - Murky) Remember to check auth
  //   const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  //   if (isAuth) {
  const { query } = validateRequest(APIName.CERTIFICATE_GET_V2, req, userId);

  if (query) {
    // Info: (20240924 - Murky) Use certificateId to get id
    //   const { certificateId } = query;
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    [payload] = mockCertificateList;
  }
  //   }

  return {
    statusMessage,
    payload,
  };
}

export async function handlePutRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: object | null = null;

  const session = await getSession(req, res);
  const { userId } = session;
  // ToDo: (20240924 - Murky) Remember to check auth
  //   const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  //   if (isAuth) {
  const { query, body } = validateRequest(APIName.CERTIFICATE_PUT_V2, req, userId);

  if (query && body) {
    // Info: (20240924 - Murky) Use certificateId to get id
    //   const { certificateId } = query;
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    [payload] = mockCertificateList;
  }
  //   }

  return {
    statusMessage,
    payload,
  };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: APIResponse }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;

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
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
