import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { publicGenerateReportUtils as postUtils } from '@/pages/api/v2/company/[companyId]/report/public/route_utils';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';

type APIResponse = number | null;

/**
 * Info: (20250502 - Shirley) Handle POST request for generating a new public report
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Format date parameters
 * 5. Generate and save report
 * 6. Validate output data
 * 7. Return formatted response
 */
const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId, companyId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;

  await checkSessionUser(session, APIName.REPORT_GENERATE, req);
  await checkUserAuthorization(APIName.REPORT_GENERATE, req, session);

  // Info: (20250502 - Shirley) 驗證請求資料
  const { body } = checkRequestData(APIName.REPORT_GENERATE, req, session);
  if (body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { projectId, type, reportLanguage, from, to, reportType } = body;

  loggerBack.info(
    `User: ${userId} generating new report for companyId: ${companyId}, type: ${type}, dates: ${from} - ${to}`
  );

  try {
    // Info: (20250502 - Shirley) 格式化日期參數
    const { startDateInSecond, endDateInSecond } = postUtils.formatStartAndEndDateFromQuery({
      reportSheetType: type,
      startDate: from,
      endDate: to,
    });

    // Info: (20250502 - Shirley) 生成並保存報表
    const thisPeriodReportId = await postUtils.generateAndSaveReport({
      companyId,
      projectId,
      startDateInSecond,
      endDateInSecond,
      reportType,
      reportSheetType: type,
      reportLanguageString: reportLanguage,
    });

    payload = thisPeriodReportId;
    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (error) {
    loggerError({
      userId,
      errorType: 'generateReport failed',
      errorMessage: 'Func. generateReport in company/companyId/report/index.ts failed',
    });
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }

  // Info: (20250502 - Shirley) 驗證輸出資料
  if (payload !== null) {
    const { isOutputDataValid, outputData } = validateOutputData(APIName.REPORT_GENERATE, payload);

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
      payload = null;
    } else {
      payload = outputData;
    }
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**
 * Info: (20250502 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 * 4. Log user action
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  const method = req.method || HttpMethod.POST;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const apiName: APIName = APIName.REPORT_GENERATE;
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
    loggerError({
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
