import { APIName } from '@/constants/api_connection';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { withRequestValidation } from '@/lib/utils/middleware';
import { NextApiRequest, NextApiResponse } from 'next';
import { publicGenerateReportUtils as postUtils } from '@/pages/api/v2/account_book/[accountBookId]/report/public/route_utils';

type PostApiResponse = number | null;

const handlePostRequest: IHandleRequest<APIName.REPORT_GENERATE, PostApiResponse> = async ({
  query,
  body,
  session,
}) => {
  const { userId } = session;

  const { accountBookId } = query;

  const { projectId, type, reportLanguage, from, to, reportType } = body;
  const { startDateInSecond, endDateInSecond } = postUtils.formatStartAndEndDateFromQuery({
    reportSheetType: type,
    startDate: from,
    endDate: to,
  });

  let payload: PostApiResponse = null;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  try {
    const thisPeriodReportId = await postUtils.generateAndSaveReport({
      accountBookId,
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
    const errorInfo = {
      userId,
      errorType: 'generateReport failed',
      errorMessage: 'Func. generateReport in company/companyId/report/index.ts failed',
    };
    (error as Error).message += ` | accountBookId: ${accountBookId} | reportType: ${reportType}`;
    loggerError(errorInfo);
  }
  return {
    statusMessage,
    payload,
  };
};

type APIResponse = number | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  POST: (req) => withRequestValidation(APIName.REPORT_GENERATE, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  const userId: number = -1;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    const errorInfo = {
      userId,
      errorType: error.name,
      errorMessage: error.message,
    };
    loggerError(errorInfo);
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
