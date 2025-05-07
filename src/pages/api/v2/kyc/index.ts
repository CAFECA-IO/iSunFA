import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IKYCBookkeeper } from '@/interfaces/kyc_bookkeeper';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { validateOutputData } from '@/lib/utils/validator';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';

/**
 * Info: (20250505 - Shirley) Handle POST request for KYC upload
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Process KYC information
 * 5. Validate output data
 * 6. Return formatted response
 */
const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IKYCBookkeeper | null = null;

  await checkSessionUser(session, APIName.KYC_UPLOAD, req);
  await checkUserAuthorization(APIName.KYC_UPLOAD, req, session);

  // Info: (20250505 - Shirley) 驗證請求資料
  const { body } = checkRequestData(APIName.KYC_UPLOAD, req, session);
  if (body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  loggerBack.info(`User: ${userId} uploading KYC bookkeeper information: ${JSON.stringify(body)}`);

  try {
    // ToDo: (20240924 - Jacky) Implement the logic to create a new KYC record in the database
    // ToDo: (20250505 - Shirley) Replace with actual implementation

    // Info: (20250505 - Shirley) Mock data for connection
    const mockedData: IKYCBookkeeper = {
      name: body.name || 'John Doe',
      birthDate: body.birthDate || '1990-01-01',
      email: body.email || 'doe@email.com',
      phone: body.phone || '12345678',
      qualification: body.qualification !== undefined ? body.qualification : true,
      certificationNumber: body.certificationNumber || '123456',
      personalIdType: body.personalIdType || 'ID',
      personalIdFileId: body.personalIdFileId || 1,
      certificationFileId: body.certificationFileId || 2,
    };

    // Info: (20250505 - Shirley) 驗證輸出資料
    const { isOutputDataValid, outputData } = validateOutputData(APIName.KYC_UPLOAD, mockedData);

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    } else {
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = outputData;
    }
  } catch (error) {
    loggerBack.error({
      message: 'Error processing KYC upload',
      error,
      userId,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**
 * Info: (20250505 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 * 4. Log user action
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IKYCBookkeeper | null>>
) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const apiName: APIName = APIName.KYC_UPLOAD;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.POST:
        ({ response, statusMessage } = await handlePostRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    loggerBack.error({
      userId: session.userId || -1,
      errorType: err.name,
      errorMessage: err.message,
    });
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
