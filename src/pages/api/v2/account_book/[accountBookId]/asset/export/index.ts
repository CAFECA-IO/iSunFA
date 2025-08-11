import { exportAssets } from '@/lib/utils/repo/export_asset.repo';
import { AssetFieldsMap } from '@/constants/export_asset';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAssetExportRequestBody } from '@/interfaces/export_asset';
import { formatApiResponse, formatTimestampByTZ, getTimestampNow } from '@/lib/utils/common';
import { convertToCSV, selectFields } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';
import { AssetHeader, AssetHeaderWithStringDate } from '@/interfaces/asset';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { APIName, HttpMethod } from '@/constants/api_connection';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { DEFAULT_TIMEZONE } from '@/constants/common';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';

/**
 * Info: (20250425 - Shirley) Handle POST request for exporting assets to CSV
 * This function follows the flat coding style, with clear steps:
 * 1. Validates the request parameters
 * 2. Retrieves asset data with appropriate filters
 * 3. Processes the data including field selection
 * 4. Formats dates according to timezone
 * 5. Converts the data to CSV format
 * 6. Sets appropriate headers and returns the CSV data
 */
async function handleAssetExport(req: NextApiRequest, res: NextApiResponse, accountBookId: string) {
  const apiName = APIName.ASSET_LIST_EXPORT;
  const statusMessage = STATUS_MESSAGE.SUCCESS;

  try {
    // Info: (20250425 - Shirley) Extract and validate request data
    const { fileType, filters, sort, options } = req.body as IAssetExportRequestBody;

    loggerBack.info(
      `Processing asset export for company ${accountBookId} with ${filters ? Object.keys(filters).length : 0} filters`
    );

    const parsedCompanyId = parseInt(accountBookId, 10);

    // Info: (20250425 - Shirley) Retrieve asset data
    const assets = await exportAssets(
      {
        filters,
        sort,
        options,
        fileType,
      },
      parsedCompanyId
    );
    loggerBack.info(`Retrieved ${assets.length} assets for export`);

    // Info: (20250425 - Shirley) Process and select fields
    let processedAssets = assets;
    const ASSET_FIELDS = Object.keys(AssetFieldsMap) as (keyof AssetHeader)[];

    if (options?.fields) {
      processedAssets = selectFields(
        processedAssets,
        options.fields as (keyof AssetHeader)[]
      ) as typeof assets;
      loggerBack.info(`Selected fields: ${options.fields.join(', ')}`);
    }

    // Info: (20250425 - Shirley) Format dates according to timezone
    const newData = processedAssets.map((asset) => {
      const formattedDate = formatTimestampByTZ(
        asset.acquisitionDate,
        options?.timezone || DEFAULT_TIMEZONE,
        'YYYY-MM-DD'
      );

      return {
        ...asset,
        acquisitionDate: formattedDate,
        number: asset.number,
      };
    });

    const fields: (keyof AssetHeader)[] =
      (options?.fields as (keyof AssetHeader)[]) || ASSET_FIELDS;

    // Info: (20250425 - Shirley) Convert to CSV format
    const csv = convertToCSV<Record<keyof AssetHeader, AssetHeader[keyof AssetHeader]>>(
      fields,
      newData as AssetHeaderWithStringDate[],
      AssetFieldsMap
    );
    loggerBack.info(`Generated CSV with ${newData.length} rows for asset export`);

    // Info: (20250425 - Shirley) Set response headers and send CSV
    const fileName = `assets_${getTimestampNow()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    loggerBack.info(`Successfully generated CSV for ${apiName}`);
    res.status(200).send(csv);
    return { success: true, statusMessage };
  } catch (error) {
    const err = error as Error;
    loggerBack.error(`Error generating asset CSV export`);
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
  const apiName = APIName.ASSET_LIST_EXPORT;
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
    if (!accountBookId || (Array.isArray(accountBookId) && accountBookId.length === 0)) {
      statusMessage = STATUS_MESSAGE.INVALID_COMPANY_ID;
      throw new Error(statusMessage);
    }
    const companyIdStr = Array.isArray(accountBookId) ? accountBookId[0] : accountBookId;

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
      loggerBack.info(
        `User ${userId} is not a member of team ${companyTeamId} for company ${companyIdStr}`
      );
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    const assertResult = convertTeamRoleCanDo({
      teamRole: userTeam.role as TeamRole,
      canDo: TeamPermissionAction.EXPORT_ASSET,
    });

    if (!assertResult.can) {
      loggerBack.info(
        `User ${userId} does not have permission to export assets for company ${companyIdStr}`
      );
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    // Info: (20250425 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    let result;

    switch (method) {
      case HttpMethod.POST:
        result = await handleAssetExport(req, res, companyIdStr);
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
