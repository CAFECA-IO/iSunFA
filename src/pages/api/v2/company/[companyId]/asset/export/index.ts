import { exportAssets } from '@/lib/utils/repo/export_asset.repo';
import { AssetFieldsMap, DEFAULT_TIMEZONE } from '@/constants/export_asset';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAssetExportRequestBody } from '@/interfaces/export_asset';
import { formatApiResponse, formatTimestampByTZ, getTimestampNow } from '@/lib/utils/common';
import { convertToCSV, selectFields } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';
import { AssetHeader, AssetHeaderWithStringDate } from '@/interfaces/asset';
import { checkRequestData, checkSessionUser, logUserAction } from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { APIName } from '@/constants/api_connection';
import { loggerError } from '@/lib/utils/logger_back';

async function handleAssetExport(
  req: NextApiRequest,
  res: NextApiResponse,
  body: IAssetExportRequestBody
): Promise<void> {
  try {
    const { fileType, filters, sort, options } = body;

    const { companyId } = req.query;
    if (!companyId || typeof companyId !== 'string') {
      throw new Error(STATUS_MESSAGE.INVALID_COMPANY_ID);
    }

    const parsedCompanyId = parseInt(companyId, 10);

    const assets = await exportAssets(
      {
        filters,
        sort,
        options,
        fileType,
      },
      parsedCompanyId
    );

    let processedAssets = assets;
    const ASSET_FIELDS = Object.keys(AssetFieldsMap) as (keyof AssetHeader)[];

    if (options?.fields) {
      processedAssets = selectFields(
        processedAssets,
        options.fields as (keyof AssetHeader)[]
      ) as typeof assets;
    }

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

    const csv = convertToCSV<Record<keyof AssetHeader, AssetHeader[keyof AssetHeader]>>(
      fields,
      newData as AssetHeaderWithStringDate[],
      AssetFieldsMap
    );

    const fileName = `assets_${getTimestampNow()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(csv);
  } catch (error) {
    const err = error as Error;
    throw err;
  }
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse,
    body: IAssetExportRequestBody
  ) => Promise<void>;
} = {
  POST: handleAssetExport,
};

// TODO: (20241111 - Shirley) refactor and adopt middleware for validation and format response
// TODO: (20241111 - Shirley) refactor the user validation to restrict the user to only export their own company's assets
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage = STATUS_MESSAGE.BAD_REQUEST;

  const session = await getSession(req, res);
  try {
    const isLogin = await checkSessionUser(session, APIName.ASSET_LIST_EXPORT, req);
    if (!isLogin) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
      throw new Error(statusMessage);
    }

    /* ToDo: (20241112 - Luphia)
     * Use @/lib/utils/auth_check_v2 to check if the user has the right to access the API
     * The function checkAuthorizationNew is a new version of checkAuthorization
     * It will return a boolean value to indicate if the user has the right to access the API

    const isAuth = await checkAuthorizationNew(APIName.ASSET_LIST_EXPORT, req, session);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }
     */

    const { query, body } = checkRequestData(APIName.ASSET_LIST_EXPORT, req);

    if (query === null || body === null) {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      throw new Error(statusMessage);
    }

    res.setHeader('Content-Type', 'text/csv');
    if (!res.getHeader('Content-Type') || res.getHeader('Content-Type') !== 'text/csv') {
      throw new Error(STATUS_MESSAGE.INVALID_CONTENT_TYPE);
    }

    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      await handleRequest(req, res, body as IAssetExportRequestBody);
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
      throw new Error(statusMessage);
    }

    const responseBody = res.getHeader('Content-Disposition');
    if (!responseBody || typeof responseBody !== 'string' || !responseBody.endsWith('.csv"')) {
      throw new Error(STATUS_MESSAGE.INVALID_FILE_FORMAT);
    }
  } catch (error) {
    const err = error as Error;
    const { httpCode, result } = formatApiResponse<null>(
      statusMessage || STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE],
      null
    );
    loggerError(
      session.userId,
      `Handler Request Error for ${APIName.ASSET_LIST_EXPORT} in middleware.ts`,
      err
    );
    res.status(httpCode).json(result);
  } finally {
    await logUserAction(session, APIName.ASSET_LIST_EXPORT, req, statusMessage);
  }
}
