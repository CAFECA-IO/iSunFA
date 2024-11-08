import { withRequestValidation } from '@/lib/utils/middleware';
import { exportAssets } from '@/lib/utils/repo/export_file.repo';
import { ExportFileType, ExportType } from '@/constants/export_file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAssetExportRequestBody, IExportRequestBody } from '@/interfaces/export_file';
import { formatApiResponse, formatTimestampByTZ, getTimestampNow } from '@/lib/utils/common';
import { convertToCSV } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';
import { APIName } from '@/constants/api_connection';

// 定義 AssetHeader 與 AssetHeaderWithStringDate
interface AssetHeader {
  acquisitionDate: number;
  name: string;
  purchasePrice: number;
  accumulatedDepreciation: number;
  residualValue: number;
  remainingLife: number;
  type: string;
  status: string;
  number: string;
}

interface AssetHeaderWithStringDate extends Omit<AssetHeader, 'acquisitionDate'> {
  acquisitionDate: string;
}

// 定義欄位名稱對應
const ASSET_FIELDS_MAP: Record<keyof AssetHeader, string> = {
  acquisitionDate: '取得日期',
  name: '資產名稱',
  purchasePrice: '購買價格',
  accumulatedDepreciation: '累積折舊',
  residualValue: '殘值',
  remainingLife: '剩餘使用年限',
  type: '資產類型',
  status: '狀態',
  number: '資產編號',
};

// 定義需要匯出的欄位
const ASSET_FIELDS = Object.keys(ASSET_FIELDS_MAP) as (keyof AssetHeader)[];

// 選擇欄位
function selectFields<T>(data: T[], fields?: (keyof T)[]): T[] {
  if (!fields || fields.length === 0) return data;
  return data.map((item) => {
    const selected = {} as T;
    fields.forEach((field) => {
      selected[field] = item[field];
    });
    return selected;
  });
}

// 處理資產匯出
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

    // 使用 exportAssets 函式獲取資產資料
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
    if (options?.fields) {
      processedAssets = selectFields(
        processedAssets,
        options.fields as (keyof AssetHeader)[]
      ) as typeof assets;
    }

    // 處理時區轉換
    const newData = processedAssets.map((asset) => {
      const formattedDate = formatTimestampByTZ(
        asset.acquisitionDate,
        options?.timezone || '+0800',
        'YYYY-MM-DD HH:mm:ss'
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
      ASSET_FIELDS_MAP
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

// 方法處理對應
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

// 預設的處理函式
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
