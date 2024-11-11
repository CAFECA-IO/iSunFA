import { exportAssets } from '@/lib/utils/repo/export_asset.repo';
import { AssetFieldsMap, DEFAULT_TIMEZONE, ExportFileType } from '@/constants/export_asset';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAssetExportRequestBody, IExportRequestBody } from '@/interfaces/export_asset';
import { formatApiResponse, formatTimestampByTZ, getTimestampNow } from '@/lib/utils/common';
import { convertToCSV, selectFields } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';
import { AssetHeader, AssetHeaderWithStringDate } from '@/interfaces/asset';

async function handleAssetExport(
  req: NextApiRequest,
  res: NextApiResponse,
  body: IAssetExportRequestBody
): Promise<void> {
  try {
    const { fileType, filters, sort, options } = body;

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
    res.status(httpCode).json(result);
  }
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse,
    body: IExportRequestBody
  ) => Promise<void>;
} = {
  POST: handleAssetExport,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const handleRequest = methodHandlers[req.method || ''];
  if (handleRequest) {
    try {
      const body = req.body as IExportRequestBody;
      await handleRequest(req, res, body);
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
}
