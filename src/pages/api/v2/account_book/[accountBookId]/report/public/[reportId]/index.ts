import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { FinancialReport, IReport } from '@/interfaces/report';
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
import { getPublicReportUtils as getUtils } from '@/pages/api/v2/account_book/[accountBookId]/report/public/[reportId]/route_utils';
import { ReportSheetType } from '@/constants/report';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import {
  createAccountingSetting,
  getAccountingSettingByCompanyId,
} from '@/lib/utils/repo/accounting_setting.repo';
import { formatAccountingSetting } from '@/lib/utils/formatter/accounting_setting.formatter';
import { IAccountingSetting } from '@/interfaces/accounting_setting';

type APIResponse = FinancialReport | null | IReport;

/**
 * Info: (20250502 - Shirley) Handle GET request for public report by ID
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Fetch report data
 * 5. Format response based on report type
 * 6. Validate output data
 * 7. Return formatted response
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;

  await checkSessionUser(session, APIName.REPORT_GET_BY_ID, req);
  await checkUserAuthorization(APIName.REPORT_GET_BY_ID, req, session);

  // Info: (20250502 - Shirley) 驗證請求資料
  const { query } = checkRequestData(APIName.REPORT_GET_BY_ID, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { reportId } = query;

  loggerBack.info(`User: ${userId} getting public report with ID: ${reportId}`);

  try {
    // Info: (20250502 - Shirley) 獲取報表資料
    const { curPeriodReport, company } = await getUtils.getPeriodReport(reportId);

    const accountingSetting = await getAccountingSettingByCompanyId(
      curPeriodReport?.accountBookId || -1
    );
    let payloadAccountingSetting: IAccountingSetting | null = null;
    if (accountingSetting) {
      payloadAccountingSetting = formatAccountingSetting(accountingSetting);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    } else {
      const createdAccountingSetting = await createAccountingSetting(
        curPeriodReport?.accountBookId || -1
      );
      if (createdAccountingSetting) {
        payloadAccountingSetting = formatAccountingSetting(createdAccountingSetting);
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      } else {
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
    }

    // Info: (20250502 - Shirley) 根據報表類型格式化回應
    if (
      curPeriodReport &&
      company &&
      curPeriodReport.reportType !== ReportSheetType.REPORT_401 &&
      payloadAccountingSetting !== null
    ) {
      payload = getUtils.formatPayloadFromIReport(
        curPeriodReport,
        company,
        payloadAccountingSetting
      );
    } else {
      payload = curPeriodReport;
    }

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (error) {
    loggerError({
      userId,
      errorType: 'generateReport failed',
      errorMessage: 'Func. generateReport in company/companyId/report/index.ts failed',
    });
    (error as Error).message = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    throw error;
  }

  // Info: (20250502 - Shirley) 驗證輸出資料
  if (payload) {
    const { isOutputDataValid, outputData } = validateOutputData(APIName.REPORT_GET_BY_ID, payload);

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
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const apiName: APIName = APIName.REPORT_GET_BY_ID;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
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
