import { withRequestValidation } from '@/lib/utils/middleware';
import { exportAssets } from '@/lib/utils/repo/export_file.repo';
import {
  AssetFieldsMap,
  DEFAULT_TIMEZONE,
  ExportFileType,
  ExportType,
} from '@/constants/export_file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAssetExportRequestBody, IExportRequestBody } from '@/interfaces/export_file';
import { formatApiResponse, formatTimestampByTZ, getTimestampNow } from '@/lib/utils/common';
import { convertToCSV, selectFields } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';
import { APIName } from '@/constants/api_connection';
import { AssetHeader, AssetHeaderWithStringDate } from '@/interfaces/asset';

async function handleAssetExport(
  req: NextApiRequest,
  res: NextApiResponse,
  body: IAssetExportRequestBody
): Promise<{ statusMessage: string; payload: string | null }> {
  try {
    const { exportType, fileType, filters, sort, options } = body;

    if (!exportType || !fileType) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    if (exportType !== ExportType.ASSETS) {
      throw new Error(STATUS_MESSAGE.INVALID_EXPORT_TYPE);
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
        exportType,
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

    return { statusMessage: STATUS_MESSAGE.SUCCESS, payload: null };
  } catch (error) {
    const err = error as Error;
    const statusMessage =
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
      STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    return { statusMessage, payload: null };
  }
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse,
    body: IExportRequestBody
  ) => Promise<{ statusMessage: string; payload: string | null }>;
} = {
  POST: async (req, res, body) => {
    switch (body.exportType) {
      case ExportType.ASSETS:
        return handleAssetExport(req, res, body as IAssetExportRequestBody);
      default:
        throw new Error(STATUS_MESSAGE.UNSUPPORTED_EXPORT_TYPE);
    }
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await withRequestValidation<APIName.FILE_EXPORT, string>(
    APIName.FILE_EXPORT,
    req,
    res,
    // TODO: 可用 query 跟 session
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async ({ query, body, session }) => {
      const handleRequest = methodHandlers[req.method || ''];
      if (handleRequest) {
        try {
          const response = await handleRequest(req, res, body as IExportRequestBody);
          if (response.payload) {
            res.status(200).send(response.payload);
          } else {
            res.status(200).json({ message: response.statusMessage });
          }
        } catch (error) {
          const err = error as Error;
          const statusMessage =
            STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
            STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
          const { httpCode, result } = formatApiResponse<null>(statusMessage, null);
          res.status(httpCode).json(result);
        }
      } else {
        const statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        const { httpCode, result } = formatApiResponse<null>(statusMessage, null);
        res.status(httpCode).json(result);
      }
      return { statusMessage: STATUS_MESSAGE.SUCCESS, payload: null };
    }
  );
}
