import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertToCSV } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { APIName, HttpMethod } from '@/constants/api_connection';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';
import {
  processLineItems,
  convertToTrialBalanceItem,
  transformTrialBalanceData,
  convertToAPIFormat,
} from '@/lib/utils/trial_balance';
import {
  trialBalanceAvailableFields,
  TrialBalanceFieldsMap,
} from '@/constants/export_trial_balance';
import { getAllLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import { findManyAccountsInPrisma } from '@/lib/utils/repo/account.repo';
import { SortOrder } from '@/constants/sort';
import { ILineItemInTrialBalanceItem } from '@/interfaces/trial_balance';
import { DEFAULT_SORT_OPTIONS } from '@/constants/trial_balance';
import { parseSortOption } from '@/lib/utils/sort';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';

/**
 * Info: (20250425 - Shirley) Handle POST request for exporting trial balance to CSV
 * This function follows the flat coding style, with clear steps:
 * 1. Validates the request parameters
 * 2. Retrieves line items and accounts data
 * 3. Processes the data into trial balance format
 * 4. Converts the data to CSV format
 * 5. Sets appropriate headers and returns the CSV data
 */
async function handlePostRequest(req: NextApiRequest, res: NextApiResponse, accountBookId: string) {
  const apiName = APIName.TRIAL_BALANCE_EXPORT;
  let statusMessage: string = STATUS_MESSAGE.SUCCESS;

  try {
    // Info: (20250425 - Shirley) Extract and validate request data
    const { fileType, filters, options } = req.body;
    const { sortOption } = req.query;
    const { startDate, endDate } = filters;

    if ((!startDate && startDate !== 0) || (!endDate && endDate !== 0)) {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      throw new Error(statusMessage);
    }

    if (fileType !== 'csv') {
      statusMessage = STATUS_MESSAGE.INVALID_FILE_TYPE;
      throw new Error(statusMessage);
    }

    loggerBack.info(
      `Processing trial balance export for company ${accountBookId}, period: ${startDate} to ${endDate}`
    );

    // Info: (20250425 - Shirley) Process the data
    const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption as string);

    // Info: (20250425 - Shirley) Retrieve line items
    const lineItems = await getAllLineItemsInPrisma(+accountBookId, 0, +endDate);
    loggerBack.info(`Retrieved ${lineItems.length} line items for trial balance export`);

    // Info: (20250425 - Shirley) Retrieve accounts
    const accounts = await findManyAccountsInPrisma({
      accountBookId: +accountBookId,
      includeDefaultAccount: true,
      page: 1,
      limit: 9999999,
      sortBy: 'code',
      sortOrder: SortOrder.ASC,
      forUser: true,
    });
    loggerBack.info(`Retrieved ${accounts.data.length} accounts for trial balance export`);

    // Info: (20250425 - Shirley) Transform line items with debit and credit amounts
    const lineItemsWithDebitCredit: ILineItemInTrialBalanceItem[] = lineItems.map((item) => ({
      ...item,
      debitAmount: item.debit ? item.amount : 0,
      creditAmount: !item.debit ? item.amount : 0,
    }));

    // Info: (20250425 - Shirley) Convert line items to trial balance format
    const threeStagesOfLineItems = convertToTrialBalanceItem(
      lineItemsWithDebitCredit,
      +startDate,
      +endDate
    );

    // Info: (20250425 - Shirley) Process line items into trial balance structure
    const threeStagesOfTrialBalance = {
      beginning: processLineItems(threeStagesOfLineItems.beginning, accounts.data).arrWithCopySelf,
      midterm: processLineItems(threeStagesOfLineItems.midterm, accounts.data).arrWithCopySelf,
      ending: processLineItems(threeStagesOfLineItems.ending, accounts.data).arrWithCopySelf,
    };

    // Info: (20250425 - Shirley) Convert to API format and transform for export
    const trialBalance = convertToAPIFormat(threeStagesOfTrialBalance, parsedSortOption);
    const trialBalanceData = transformTrialBalanceData(trialBalance.items);
    loggerBack.info(`Transformed ${trialBalanceData.length} items for CSV export`);

    // Info: (20250425 - Shirley) Prepare CSV data
    const data = trialBalanceData;
    const fields = options?.fields || trialBalanceAvailableFields;
    const csv = convertToCSV(fields, data, TrialBalanceFieldsMap);

    // Info: (20250425 - Shirley) Set response headers and send CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=trial_balance_${Date.now()}.csv`);
    loggerBack.info(`Successfully generated CSV with ${data.length} rows for ${apiName}`);
    res.send(csv);
    return { success: true, statusMessage };
  } catch (error) {
    const err = error as Error;
    loggerBack.error(`Error generating trial balance CSV export`);
    loggerBack.error(error);

    return { success: false, statusMessage: err.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR };
  }
}

/**
 * Info: (20250425 - Shirley) Export default handler function
 * This follows the flat coding style API pattern for file exports:
 * 1. Get and validate user session
 * 2. Check user authorization
 * 3. Validate team permissions
 * 4. Handle the export request based on HTTP method
 * 5. Handle errors consistently
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiName = APIName.TRIAL_BALANCE_EXPORT;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  // Info: (20250425 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  try {
    // Info: (20250425 - Shirley) Check if user is logged in
    await checkSessionUser(session, apiName, req);

    // Info: (20250425 - Shirley) Check user authorization
    await checkUserAuthorization(apiName, req, session);

    // Info: (20250425 - Shirley) Validate request data
    const { query, body } = checkRequestData(apiName, req, session);
    if (!query || !body) {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      throw new Error(statusMessage);
    }

    // Info: (20250425 - Shirley) Validate company ID
    const { accountBookId } = query;

    // Info: (20250425 - Shirley) Check team permissions
    const accountBook = await getCompanyById(+accountBookId);
    if (!accountBook) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      throw new Error(statusMessage);
    }

    const { teamId: accountBookTeamId } = accountBook;
    if (!accountBookTeamId) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      throw new Error(statusMessage);
    }

    const userTeam = teams?.find((team) => team.id === accountBookTeamId);
    if (!userTeam) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    const assertResult = convertTeamRoleCanDo({
      teamRole: userTeam.role as TeamRole,
      canDo: TeamPermissionAction.EXPORT_TRIAL_BALANCE,
    });

    if (!assertResult.can) {
      loggerBack.info(
        `User ${userId} does not have permission to export trial balance for company ${accountBookId}`
      );
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    // Info: (20250425 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    let result;

    switch (method) {
      case HttpMethod.POST:
        result = await handlePostRequest(req, res, accountBookId);
        if (!result.success) {
          statusMessage = result.statusMessage;
          throw new Error(statusMessage);
        }
        statusMessage = STATUS_MESSAGE.SUCCESS;
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        throw new Error(statusMessage);
    }
  } catch (error) {
    // Info: (20250425 - Shirley) Handle errors
    const err = error as Error;
    loggerError({
      userId: session.userId,
      errorType: `Handler Request Error for ${apiName}`,
      errorMessage: err.message,
    });

    const { httpCode, result } = formatApiResponse<null>(
      statusMessage || STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE],
      null
    );
    res.status(httpCode).json(result);
  } finally {
    // Info: (20250425 - Shirley) Log user action
    await logUserAction(session, apiName, req, statusMessage);
  }
}
