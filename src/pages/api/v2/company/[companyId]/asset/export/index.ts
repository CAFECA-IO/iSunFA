/* eslint-disable no-console */
import { exportAssets } from '@/lib/utils/repo/export_asset.repo';
import { AssetFieldsMap, DEFAULT_TIMEZONE, ExportFileType } from '@/constants/export_asset';
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
import { APIName } from '@/constants/api_connection';

async function handleAssetExport(
  req: NextApiRequest,
  res: NextApiResponse,
  body: IAssetExportRequestBody
): Promise<void> {
  try {
    const { fileType, filters, sort, options } = body;

    console.log('body in handleAssetExport', body);
    console.log('req', req);
    console.log('res', res);

    if (!fileType) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    if (fileType !== ExportFileType.CSV) {
      throw new Error(STATUS_MESSAGE.INVALID_FILE_TYPE);
    }

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
    const statusMessage =
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
      STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    const { httpCode, result } = formatApiResponse<null>(statusMessage, null);
    console.log('error in handleAssetExport', err);
    res.status(httpCode).json(result);
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // validate user authorization
  let statusMessage = STATUS_MESSAGE.BAD_REQUEST;
  let payload: string | null = null;

  const session = await getSession(req, res);
  const isLogin = await checkSessionUser(session);
  console.log('session in handler function', session);
  console.log('isLogin in handler function', isLogin);

  if (!isLogin) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkUserAuthorization(session.userId, APIName.ASSET_LIST_EXPORT);
    console.log('isAuth in handler function', isAuth);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { query, body } = checkRequestData(APIName.ASSET_LIST_EXPORT, req);
      console.log('query in handler function', query);
      console.log('body in handler function', body);
      if (query !== null && body !== null) {
        const handleRequest = methodHandlers[req.method || ''];
        if (handleRequest) {
          try {
            const reqBody = req.body as IAssetExportRequestBody;
            await handleRequest(req, res, reqBody);
            // TODO: how to format and validate the output data as csv file mime type?
          } catch (_error) {
            const error = _error as Error;
            statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
            payload = error.message;

            const { httpCode, result } = formatApiResponse<string | null>(statusMessage, payload);
            res.status(httpCode).json(result);
          }
        } else {
          statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
          const { httpCode, result } = formatApiResponse<string | null>(statusMessage, payload);
          res.status(httpCode).json(result);
        }
      } else {
        statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      }
    }

    await logUserAction(session, APIName.ASSET_LIST_EXPORT, req, statusMessage);

    const { httpCode, result } = formatApiResponse<string | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
