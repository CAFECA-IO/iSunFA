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
import { formatApiResponse, formatTimestampByTZ } from '@/lib/utils/common';
import {
  convertLedgerItemToCsvData,
  fetchLineItems,
  filterByAccountRange,
  filterByLabelType,
  sortAndCalculateBalances,
} from '@/lib/utils/ledger';
import { DEFAULT_TIMEZONE } from '@/constants/common';
import { ledgerAvailableFields, LedgerFieldsMap } from '@/constants/export_ledger';
import { findVouchersByVoucherIds } from '@/lib/utils/repo/voucher.repo';
import { LabelType } from '@/constants/ledger';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';

/**
 * Info: (20250425 - Shirley) Handle POST request for exporting ledger to CSV
 * This function follows the flat coding style, with clear steps:
 * 1. Validates the request parameters
 * 2. Retrieves line items filtered by date range, account range, and label type
 * 3. Processes line items and calculates balances
 * 4. Fetches vouchers for additional context
 * 5. Converts the data to CSV format
 * 6. Sets appropriate headers and returns the CSV data
 */
async function handlePostRequest(req: NextApiRequest, res: NextApiResponse, companyId: string) {
  const apiName = APIName.LEDGER_EXPORT;
  let statusMessage: string = STATUS_MESSAGE.SUCCESS;

  try {
    // Info: (20250425 - Shirley) Extract and validate request data
    const { fileType, filters, options } = req.body;
    const { startDate, endDate, labelType, startAccountNo, endAccountNo } = filters;

    if ((!startDate && startDate !== 0) || (!endDate && endDate !== 0)) {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      throw new Error(statusMessage);
    }

    if (fileType !== 'csv') {
      statusMessage = STATUS_MESSAGE.INVALID_FILE_TYPE;
      throw new Error(statusMessage);
    }

    loggerBack.info(
      `Processing ledger export for company ${companyId}, period: ${startDate} to ${endDate}`
    );

    // Info: (20250425 - Shirley) Process the data
    let lineItems = await fetchLineItems(+companyId, +startDate, +endDate);
    loggerBack.info(`Retrieved ${lineItems.length} line items for ledger export`);

    // Info: (20250425 - Shirley) Apply filters
    lineItems = filterByAccountRange(lineItems, startAccountNo, endAccountNo);
    lineItems = filterByLabelType(lineItems, labelType as LabelType);
    const processedLineItems = sortAndCalculateBalances(lineItems);
    loggerBack.info(`Processed ${processedLineItems.length} line items after filtering`);

    // Info: (20250425 - Shirley) Fetch related vouchers
    const voucherIds = processedLineItems.map((ledger) => ledger.voucherId);
    const vouchers = await findVouchersByVoucherIds(voucherIds);
    loggerBack.info(`Retrieved ${vouchers.length} vouchers for ledger export`);

    // Info: (20250425 - Shirley) Format voucher dates with timezone
    const vouchersWithTz = vouchers.map((voucher) => ({
      ...voucher,
      date: formatTimestampByTZ(voucher.date, options?.timezone || DEFAULT_TIMEZONE, 'YYYY-MM-DD'),
    }));
    const vouchersMap = new Map(vouchersWithTz.map((voucher) => [voucher.id, voucher]));

    // Info: (20250425 - Shirley) Convert ledger items to CSV format
    const ledgerCsvData = convertLedgerItemToCsvData(processedLineItems, vouchersMap);
    const data = ledgerCsvData;

    // Info: (20250425 - Shirley) Handle field selection
    const fields = options?.fields || ledgerAvailableFields;
    const csv = convertToCSV(fields, data, LedgerFieldsMap);
    loggerBack.info(`Generated CSV with ${data.length} rows for ledger export`);

    // Info: (20250425 - Shirley) Set response headers and send CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=ledger_${Date.now()}.csv`);
    loggerBack.info(`Successfully generated CSV for ${apiName}`);
    res.send(csv);
    return { success: true, statusMessage };
  } catch (error) {
    const err = error as Error;
    loggerBack.error(`Error generating ledger CSV export`, {
      error: err,
      errorMessage: err.message,
    });
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
  const apiName = APIName.LEDGER_EXPORT;
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
    const companyIdStr = typeof accountBookId === 'string' ? accountBookId : String(accountBookId);
    if (!companyIdStr) {
      statusMessage = STATUS_MESSAGE.INVALID_COMPANY_ID;
      throw new Error(statusMessage);
    }

    // Info: (20250425 - Shirley) Check team permissions
    const company = await getCompanyById(+companyIdStr);
    if (!company) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      throw new Error(statusMessage);
    }

    const { teamId: companyTeamId } = company;
    if (!companyTeamId) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      throw new Error(statusMessage);
    }

    const userTeam = teams?.find((team) => team.id === companyTeamId);
    if (!userTeam) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    const assertResult = convertTeamRoleCanDo({
      teamRole: userTeam.role as TeamRole,
      canDo: TeamPermissionAction.EXPORT_LEDGER,
    });

    if (!assertResult.can) {
      loggerBack.info(
        `User ${userId} does not have permission to export ledger for company ${companyIdStr}`
      );
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    // Info: (20250425 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    let result;

    switch (method) {
      case HttpMethod.POST:
        result = await handlePostRequest(req, res, companyIdStr);
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
