import { ExportFileType, ExportType } from '@/constants/export_file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAssetExportRequestBody, IAssetSort } from '@/interfaces/export_file';
import { formatApiResponse, formatTimestampByTZ, getTimestampNow } from '@/lib/utils/common';
import { convertToCSV } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';

// TODO: (20241107 - Shirley) 用 zod／| AnotherExportRequestBody 等等
type IExportRequestBody = IAssetExportRequestBody;

// TODO: (20241107 - Shirley) 模擬資產資料
interface AssetHeader {
  acquisitionDate: number;
  name: string;
  purchasePrice: number;
  accumulatedDepreciation: number;
  residualValue: number;
  remainingLife: number;
  type: string;
  status: string;
  assetNumber: string;
}

interface AssetHeaderWithStringDate extends Omit<AssetHeader, 'acquisitionDate'> {
  acquisitionDate: string;
}

// TODO: (20241107 - Shirley) 取得欄位名稱
const ASSET_FIELDS_MAP: Record<keyof AssetHeader, string> = {
  acquisitionDate: '取得日期',
  name: '資產名稱',
  purchasePrice: '購買價格',
  accumulatedDepreciation: '累積折舊',
  residualValue: '殘值',
  remainingLife: '剩餘使用年限',
  type: '資產類型',
  status: '狀態',
  assetNumber: '資產編號',
};

// TODO: (20241107 - Shirley) 取得欄位名稱
const ASSET_FIELDS = Object.keys(ASSET_FIELDS_MAP) as (keyof AssetHeader)[];

// TODO: (20241107 - Shirley) 模擬資產資料
// const MOCK_ASSETS: AssetHeader[] = [
//   {
//     name: '辦公桌',
//     acquisitionDate: 1530959244,
//     purchasePrice: 300000,
//     accumulatedDepreciation: 5000,
//     residualValue: 25000,
//     remainingLife: 10000000,
//     type: 'furniture',
//     status: 'normal',
//     assetNumber: 'A-7890',
//   },
//   {
//     name: '滑鼠',
//     acquisitionDate: 1530959244,
//     purchasePrice: 200000,
//     accumulatedDepreciation: 5000,
//     residualValue: 15000,
//     remainingLife: 10000000,
//     type: 'equipment',
//     status: 'normal',
//     assetNumber: 'A-7891',
//   },
//   {
//     name: '筆電',
//     acquisitionDate: 1630959244,
//     purchasePrice: 30000,
//     accumulatedDepreciation: 5000,
//     residualValue: 25000,
//     remainingLife: 1000000,
//     type: 'electronics',
//     status: 'normal',
//     assetNumber: 'A-7892',
//   },
//   {
//     name: '手機',
//     acquisitionDate: 1730959244,
//     purchasePrice: 10000,
//     accumulatedDepreciation: 2000,
//     residualValue: 8000,
//     remainingLife: 10000,
//     type: 'electronics',
//     status: 'maintenance',
//     assetNumber: 'A-7893',
//   },
// ];
// 生成隨機資產資料的函數
function generateMockAsset(index: number): AssetHeader {
  const types = ['furniture', 'equipment', 'electronics'];
  const statuses = ['normal', 'maintenance'];
  const names = ['辦公桌', '滑鼠', '筆電', '手機', '螢幕', '鍵盤', '印表機', '投影機'];

  return {
    name: `${names[Math.floor(Math.random() * names.length)]}_${index}`,
    // acquisitionDate: Math.floor(1530959244 + Math.random() * 200000000),
    acquisitionDate: 1731097774,
    purchasePrice: Math.floor(1000 + Math.random() * 500000),
    accumulatedDepreciation: Math.floor(1000 + Math.random() * 10000),
    residualValue: Math.floor(1000 + Math.random() * 50000),
    remainingLife: Math.floor(10000 + Math.random() * 10000000),
    type: types[Math.floor(Math.random() * types.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    assetNumber: `A-${10000 + index}`,
  };
}

// 生成大量模擬資料
const MOCK_ASSETS: AssetHeader[] = Array.from({ length: 100000 }, (_, index) =>
  generateMockAsset(index)
);

// TODO: (20241107 - Shirley) mock排序資料
function sortData<T>(data: T[], sortOptions?: IAssetSort[]): T[] {
  if (!sortOptions?.length) return data;

  return [...data].sort((a, b) => {
    return sortOptions.reduce((acc, { by, order }) => {
      if (acc !== 0) return acc;

      const field = by as keyof T;
      if (a[field] === b[field]) return acc;

      const multiplier = order === 'asc' ? 1 : -1;
      const aValue = a[field];
      const bValue = b[field];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return multiplier * aValue.localeCompare(bValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return multiplier * (aValue - bValue);
      }
      return 0;
    }, 0);
  });
}

// TODO: (20241107 - Shirley) mock過濾資料
function filterData<T extends AssetHeader>(
  data: T[],
  filters?: IAssetExportRequestBody['filters']
): T[] {
  if (!filters) return data;
  return data.filter((item) => {
    if (filters.type && item.type !== filters.type) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.startDate && item.acquisitionDate < filters.startDate) return false;
    if (filters.endDate && item.acquisitionDate > filters.endDate) return false;
    if (filters.searchQuery && !item.name.includes(filters.searchQuery)) return false;
    return true;
  });
}

// TODO: (20241107 - Shirley) mock選擇欄位
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

// TODO: (20241107 - Shirley) mock 處理資產匯出
async function handleAssetExport(
  req: NextApiRequest,
  res: NextApiResponse,
  body: IAssetExportRequestBody
): Promise<void> {
  try {
    const { companyId } = req.query;
    if (!companyId || typeof companyId !== 'string') {
      throw new Error('Invalid companyId');
    }

    const { exportType, fileType, filters, sort, options } = body;

    // TODO: (20241107 - Shirley) error message 要改
    if (!exportType || !fileType) {
      throw new Error('Missing required fields');
    }

    // TODO: (20241107 - Shirley) error message 要改
    if (exportType !== 'assets') {
      throw new Error('Invalid export type for handleAssetExport');
    }

    // TODO: (20241107 - Shirley) error message 要改
    if (fileType !== ExportFileType.CSV) {
      throw new Error('Invalid file type');
    }

    // TODO: (20241107 - Shirley) 從資料庫獲取資產資料
    let assets: AssetHeader[] = MOCK_ASSETS;

    if (filters) {
      assets = filterData(assets, filters);
    }

    if (sort) {
      // TODO: (20241108 - Shirley) use safeParse by zod
      assets = sortData(assets, sort as IAssetSort[]);
    }

    if (options && options.fields) {
      assets = selectFields(assets, options.fields as (keyof AssetHeader)[]) as AssetHeader[];
    }

    // TODO: (20241107 - Shirley) 處理時區轉換 (暫未實作)
    const newData = assets.map((asset) => {
      const formattedDate = formatTimestampByTZ(
        asset.acquisitionDate,
        options?.timezone || '+0800',
        'YYYY-MM-DD HH:mm:ss'
      );

      return {
        ...asset,
        acquisitionDate: formattedDate,
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
  } catch (error) {
    const err = error as Error;
    const { httpCode, result } = formatApiResponse<null>(err.message, null);
    res.status(httpCode).json(result);
  }
}

// TODO: (20241107 - Shirley) 可以在這裡新增其他 exportType 的處理函式

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse,
    body: IExportRequestBody
  ) => Promise<void>;
} = {
  POST: async (req, res, body) => {
    switch (body.exportType) {
      case ExportType.ASSETS:
        await handleAssetExport(req, res, body as IAssetExportRequestBody);
        break;
      default:
        // TODO: (20241107 - Shirley) error message 要改
        throw new Error('Unsupported export type');
    }
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const handleRequest = methodHandlers[req.method || ''];
  if (handleRequest) {
    try {
      const body = req.body as IExportRequestBody;
      await handleRequest(req, res, body);
    } catch (error) {
      const err = error as Error;
      const { httpCode, result } = formatApiResponse<null>(err.message, null);
      res.status(httpCode).json(result);
    }
  } else {
    const statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    const { httpCode, result } = formatApiResponse<null>(statusMessage, null);
    res.status(httpCode).json(result);
  }
}
