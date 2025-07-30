import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse, getTimestampOfSameDateOfLastYear } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { validateRequest } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';

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

type APIResponse = object | null;

// TODO: (20241126 - Shirley) FIXME: account table schema 有修改，account code 可能重複，需要改用 account id
export async function balanceSheetHandler({
  // ToDo: (20241007 - Murky) Use these param in function
  /* eslint-disable @typescript-eslint/no-unused-vars */
  companyId,
  startDate,
  endDate,
  language,
  /* eslint-enable @typescript-eslint/no-unused-vars */
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
  /* eslint-disable @typescript-eslint/no-unused-vars */
  companyId,
  startDate,
  endDate,
  language,
  /* eslint-enable @typescript-eslint/no-unused-vars */
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
  /* eslint-disable @typescript-eslint/no-unused-vars */
  companyId,
  startDate,
  endDate,
  language,
  /* eslint-enable @typescript-eslint/no-unused-vars */
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
  /* eslint-disable @typescript-eslint/no-unused-vars */
  companyId,
  startDate,
  endDate,
  language,
  /* eslint-enable @typescript-eslint/no-unused-vars */
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

<<<<<<< HEAD
export async function handleGetRequest(req: NextApiRequest) {
=======
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
>>>>>>> feature/fix-integration-test-refactoring
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: object | null = null;

  const session = await getSession(req);
  const { userId, accountBookId: companyId } = session;

  // ToDo: (20240924 - Murky) We need to check auth
  const { query } = validateRequest(APIName.REPORT_GET_V2, req, userId);

  if (query) {
    // ToDo: (20240924 - Murky) Remember to use sortBy, sortOrder, startDate, endDate, searchQuery, hasBeenUsed
    const { startDate, endDate, language, reportType } = query;
    const reportHandler = reportHandlers[reportType];

    ({ payload, statusMessage } = await reportHandler({
      companyId,
      startDate,
      endDate,
      language,
    }));
  }

<<<<<<< HEAD
  return {
    statusMessage,
    payload,
    userId,
  };
}
=======
  // Info: (20250502 - Shirley) 獲取報表參數
  const { accountBookId: companyId, startDate, endDate, language, reportType } = query;
>>>>>>> feature/fix-integration-test-refactoring

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: APIResponse; userId: number }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  let userId = -1;
  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload, userId } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
