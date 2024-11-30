import { APIName } from '@/constants/api_connection';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { FinancialReport, IReport } from '@/interfaces/report';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { withRequestValidation } from '@/lib/utils/middleware';
import { NextApiRequest, NextApiResponse } from 'next';
import { getPublicReportUtils as getUtils } from '@/pages/api/v2/company/[companyId]/report/public/[reportId]/route_utils';
import { ReportSheetType } from '@/constants/report';

type PostApiResponse = FinancialReport | null | IReport;

const handleGetRequest: IHandleRequest<APIName.REPORT_GET_BY_ID, PostApiResponse> = async ({
  query,
  session,
}) => {
  const { userId } = session;
  const { reportId } = query;

  let payload: PostApiResponse = null;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  try {
    const { curPeriodReport, company } = await getUtils.getPeriodReport(reportId);
    if (curPeriodReport && company && curPeriodReport.reportType !== ReportSheetType.REPORT_401) {
      payload = getUtils.formatPayloadFromIReport(curPeriodReport, company);
    } else {
      payload = curPeriodReport;
    }
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (error) {
    const errorInfo = {
      userId,
      errorType: 'generateReport failed',
      errorMessage: 'Func. generateReport in company/companyId/report/index.ts failed',
    };
    loggerError(errorInfo);
  }
  return {
    statusMessage,
    payload,
  };
};

type APIResponse = FinancialReport | null | IReport;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.REPORT_GET_BY_ID, req, res, handleGetRequest),
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
