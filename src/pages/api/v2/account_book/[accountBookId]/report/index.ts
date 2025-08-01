import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse, getTimestampOfSameDateOfLastYear } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';

import { loggerError } from '@/lib/utils/logger_back';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import {
  getReportFilterByReportType,
  transformAccountsMapToFilterSequence,
  transformAccountsToMap,
} from '@/pages/api/v2/account_book/[accountBookId]/report/route_utils';
import { ReportSheetType } from '@/constants/report';
import BalanceSheetGenerator from '@/lib/utils/report/balance_sheet_generator';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { FinancialReport } from '@/interfaces/report';
import IncomeStatementGenerator from '@/lib/utils/report/income_statement_generator';
import CashFlowStatementGenerator from '@/lib/utils/report/cash_flow_statement_generator';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';

type APIResponse = object | null;

// TODO: (20241126 - Shirley) FIXME: account table schema 有修改，account code 可能重複，需要改用 account id
export async function balanceSheetHandler({
  // ToDo: (20241007 - Murky) Use these param in function
  companyId,
  startDate,
  endDate,
  // Deprecated: (20250429 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  language,
}: {
  companyId: number;
  startDate: number;
  endDate: number;
  language: string;
}): Promise<{
  statusMessage: string;
  payload: FinancialReport | null;
}> {
  // ToDo: (20241016 - Murky) Need integration test

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: FinancialReport | null = null;

  const company = await getCompanyById(companyId);
  if (company) {
    /**
     * Info: (20241016 - Murky)
     * @description
     * Report filter is for reshaping output of Financial Report for front end needed
     */
    const reportFilter = getReportFilterByReportType(ReportSheetType.BALANCE_SHEET);

    /**
     * Info: (20241016 - Murky)
     * @description the V1 (alpha) version of balance sheet generator
     */
    const balanceSheetGenerator = new BalanceSheetGenerator(companyId, 0, endDate);

    const { content } = await balanceSheetGenerator.generateReport();

    /**
     * Info: (20241016 - Murky)
     * @description Extracted content from the generated balance sheet report.
     * @property {IAccountReadyForFrontend[]} accounts - The accounts that match general mapping
     * @property otherInfo - Additional information for graph display in report
     */
    const { content: accounts, otherInfo } = content;

    const accountsMap = transformAccountsToMap(accounts);

    const generalFilteredAccounts = transformAccountsMapToFilterSequence({
      filter: reportFilter.general,
      accountsMap,
    });

    const detailFilteredAccounts = transformAccountsMapToFilterSequence({
      filter: reportFilter.detail,
      accountsMap,
    });

    const curFrom = startDate;
    const curTo = endDate;

    const preFrom = getTimestampOfSameDateOfLastYear(curFrom);
    const preTo = getTimestampOfSameDateOfLastYear(curTo);

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = {
      company: {
        id: company.id,
        code: company.taxId,
        name: company.name,
      },
      reportType: ReportSheetType.BALANCE_SHEET,
      preDate: {
        from: preFrom,
        to: preTo,
      },
      curDate: {
        from: curFrom,
        to: curTo,
      },
      details: detailFilteredAccounts,
      general: generalFilteredAccounts,
      otherInfo,
    };
  }
  return {
    statusMessage,
    payload,
  };
}

// TODO: (20241126 - Shirley) FIXME: account table schema 有修改，account code 可能重複，需要改用 account id
export async function incomeStatementHandler({
  // ToDo: (20241007 - Murky) Use these param in function
  companyId,
  startDate,
  endDate,
  // Deprecated: (20250429 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  language,
}: {
  companyId: number;
  startDate: number;
  endDate: number;
  language: string;
}): Promise<{
  statusMessage: string;
  payload: FinancialReport | null;
}> {
  // ToDo: (20241016 - Murky) Need integration test

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: FinancialReport | null = null;

  const company = await getCompanyById(companyId);
  if (company) {
    /**
     * Info: (20241016 - Murky)
     * @description
     * Report filter is for reshaping output of Financial Report for front end needed
     */
    const reportFilter = getReportFilterByReportType(ReportSheetType.INCOME_STATEMENT);

    /**
     * Info: (20241016 - Murky)
     * @description the V1 (alpha) version of income statement generator
     */
    const incomeStatementGenerator = new IncomeStatementGenerator(companyId, startDate, endDate);

    const { content } = await incomeStatementGenerator.generateReport();

    /**
     * Info: (20241016 - Murky)
     * @description Extracted content from the generated income statement report.
     * @property {IAccountReadyForFrontend[]} accounts - The accounts that match general mapping
     * @property otherInfo - Additional information for graph display in report
     */
    const { content: accounts, otherInfo } = content;

    const accountsMap = transformAccountsToMap(accounts);

    const generalFilteredAccounts = transformAccountsMapToFilterSequence({
      filter: reportFilter.general,
      accountsMap,
    });

    const detailFilteredAccounts = transformAccountsMapToFilterSequence({
      filter: reportFilter.detail,
      accountsMap,
    });

    const curFrom = startDate;
    const curTo = endDate;

    const preFrom = getTimestampOfSameDateOfLastYear(curFrom);
    const preTo = getTimestampOfSameDateOfLastYear(curTo);

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = {
      company: {
        id: company.id,
        code: company.taxId,
        name: company.name,
      },
      reportType: ReportSheetType.INCOME_STATEMENT,
      preDate: {
        from: preFrom,
        to: preTo,
      },
      curDate: {
        from: curFrom,
        to: curTo,
      },
      details: detailFilteredAccounts,
      general: generalFilteredAccounts,
      otherInfo,
    };
  }
  return {
    statusMessage,
    payload,
  };
}

// TODO: (20241126 - Shirley) FIXME: account table schema 有修改，account code 可能重複，需要改用 account id
export async function cashFlowHandler({
  // ToDo: (20241007 - Murky) Use these param in function
  companyId,
  startDate,
  endDate,
  // Deprecated: (20250429 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  language,
}: {
  companyId: number;
  startDate: number;
  endDate: number;
  language: string;
}): Promise<{
  statusMessage: string;
  payload: FinancialReport | null;
}> {
  // ToDo: (20241016 - Murky) Need integration test

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: FinancialReport | null = null;

  const company = await getCompanyById(companyId);
  if (company) {
    /**
     * Info: (20241016 - Murky)
     * @description
     * Report filter is for reshaping output of Financial Report for front end needed
     */
    const reportFilter = getReportFilterByReportType(ReportSheetType.CASH_FLOW_STATEMENT);

    /**
     * Info: (20241016 - Murky)
     * @description the V1 (alpha) version of cash flow generator
     */
    const cashFlowGenerator = await CashFlowStatementGenerator.createInstance(
      companyId,
      startDate,
      endDate
    );

    const { content } = await cashFlowGenerator.generateReport();

    /**
     * Info: (20241016 - Murky)
     * @description Extracted content from the generated cash flow report.
     * @property {IAccountReadyForFrontend[]} accounts - The accounts that match general mapping
     * @property otherInfo - Additional information for graph display in report
     */
    const { content: accounts, otherInfo } = content;

    const accountsMap = transformAccountsToMap(accounts);

    const generalFilteredAccounts = transformAccountsMapToFilterSequence({
      filter: reportFilter.general,
      accountsMap,
    });

    const detailFilteredAccounts = transformAccountsMapToFilterSequence({
      filter: reportFilter.detail,
      accountsMap,
    });

    const curFrom = startDate;
    const curTo = endDate;

    const preFrom = getTimestampOfSameDateOfLastYear(curFrom);
    const preTo = getTimestampOfSameDateOfLastYear(curTo);

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = {
      company: {
        id: company.id,
        code: company.taxId,
        name: company.name,
      },
      reportType: ReportSheetType.CASH_FLOW_STATEMENT,
      preDate: {
        from: preFrom,
        to: preTo,
      },
      curDate: {
        from: curFrom,
        to: curTo,
      },
      details: detailFilteredAccounts,
      general: generalFilteredAccounts,
      otherInfo,
    };
  }
  return {
    statusMessage,
    payload,
  };
}

export async function report401Handler({
  // ToDo: (20241007 - Murky) Use these param in function
  // Deprecated: (20250429 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  companyId,
  // Deprecated: (20250429 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  startDate,
  // Deprecated: (20250429 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endDate,
  // Deprecated: (20250429 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  language,
}: {
  companyId: number;
  startDate: number;
  endDate: number;
  language: string;
}): Promise<{
  statusMessage: string;
  payload: FinancialReport | null;
}> {
  // ToDo: (20241016 - Murky) Need to implement this
  const statusMessage: string = STATUS_MESSAGE.SUCCESS_UPDATE;
  const payload = null;
  return {
    statusMessage,
    payload,
  };
}

type ReportHandlers = {
  [K in FinancialReportTypesKey]: ({
    companyId,
    startDate,
    endDate,
    language,
  }: {
    companyId: number;
    startDate: number;
    endDate: number;
    language: string;
  }) => Promise<{ statusMessage: string; payload: FinancialReport | null }>;
};

const reportHandlers: ReportHandlers = {
  [FinancialReportTypesKey.balance_sheet]: balanceSheetHandler,
  [FinancialReportTypesKey.comprehensive_income_statement]: incomeStatementHandler,
  [FinancialReportTypesKey.cash_flow_statement]: cashFlowHandler,
  [FinancialReportTypesKey.report_401]: report401Handler,
};

/**
 * Info: (20250502 - Shirley) Handle GET request for financial reports
 * This function follows the flat coding style pattern:
 * 1. Get user session and validate authentication
 * 2. Check user authorization
 * 3. Validate request data
 * 4. Process the report based on report type
 * 5. Validate output data
 * 6. Return formatted response
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;

  await checkSessionUser(session, APIName.REPORT_GET_V2, req);
  await checkUserAuthorization(APIName.REPORT_GET_V2, req, session);

  // Info: (20250502 - Shirley) 驗證請求資料
  const { query } = checkRequestData(APIName.REPORT_GET_V2, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250502 - Shirley) 獲取報表參數
  const { accountBookId: companyId, startDate, endDate, language, reportType } = query;

  // Info: (20250502 - Shirley) 根據報表類型生成報表
  const reportHandler = reportHandlers[reportType as FinancialReportTypesKey];

  if (!reportHandler) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250502 - Shirley) 生成報表
  const reportResult = await reportHandler({
    companyId,
    startDate,
    endDate,
    language,
  });

  statusMessage = reportResult.statusMessage;
  payload = reportResult.payload;

  // Info: (20250502 - Shirley) 驗證輸出資料
  const { isOutputDataValid, outputData } = validateOutputData(APIName.REPORT_GET_V2, payload);

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    payload = null;
  } else {
    payload = outputData as APIResponse;
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
  const apiName: APIName = APIName.REPORT_GET_V2;
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
