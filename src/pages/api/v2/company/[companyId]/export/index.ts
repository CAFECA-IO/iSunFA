import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { convertToCSV } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';

interface BaseExportRequestBody {
  exportType: string;
  fileType: ExportFileType;
}

enum ExportFileType {
  CSV = 'csv',
}

enum ExportType {
  ASSETS = 'assets',
}

interface AssetExportRequestBody extends BaseExportRequestBody {
  exportType: ExportType.ASSETS;
  filters?: {
    type?: string;
    status?: string;
    startDate?: number;
    endDate?: number;
    searchQuery?: string;
  };
  sortOption?: string;
  options?: {
    language?: string;
    timezone?: string;
    fields?: string[];
  };
}

// TODO: (20241107 - Shirley) 可以在這裡新增其他 exportType 的請求介面
// interface AnotherExportRequestBody extends BaseExportRequestBody {
//   exportType: 'anotherType';
//   // 其他特定欄位
// }

type ExportRequestBody = AssetExportRequestBody; // TODO: (20241107 - Shirley) | AnotherExportRequestBody 等等

interface Asset {
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

const ASSET_FIELDS: (keyof Asset)[] = [
  'acquisitionDate',
  'name',
  'purchasePrice',
  'accumulatedDepreciation',
  'residualValue',
  'remainingLife',
  'type',
  'status',
  'assetNumber',
];

// TODO: (20241107 - Shirley) 模擬資產資料
const MOCK_ASSETS: Asset[] = [
  {
    name: '辦公桌',
    acquisitionDate: 1530959244,
    purchasePrice: 300000,
    accumulatedDepreciation: 5000,
    residualValue: 25000,
    remainingLife: 10000000,
    type: 'furniture',
    status: 'normal',
    assetNumber: 'A-7890',
  },
  {
    name: '滑鼠',
    acquisitionDate: 1530959244,
    purchasePrice: 200000,
    accumulatedDepreciation: 5000,
    residualValue: 15000,
    remainingLife: 10000000,
    type: 'equipment',
    status: 'normal',
    assetNumber: 'A-7891',
  },
  {
    name: '筆電',
    acquisitionDate: 1630959244,
    purchasePrice: 30000,
    accumulatedDepreciation: 5000,
    residualValue: 25000,
    remainingLife: 1000000,
    type: 'electronics',
    status: 'normal',
    assetNumber: 'A-7892',
  },
  {
    name: '手機',
    acquisitionDate: 1730959244,
    purchasePrice: 10000,
    accumulatedDepreciation: 2000,
    residualValue: 8000,
    remainingLife: 10000,
    type: 'electronics',
    status: 'maintenance',
    assetNumber: 'A-7893',
  },
];

type SortField =
  | 'acquisitionDate'
  | 'purchasePrice'
  | 'accumulatedDepreciation'
  | 'residualValue'
  | 'remainingLife';
type SortOrder = 'asc' | 'desc';

// TODO: (20241107 - Shirley) 解析排序選項
function parseSortOptions(sortOption: string): Array<{ field: SortField; order: SortOrder }> {
  if (!sortOption) return [];
  return sortOption.split('-').map((option) => {
    const [field, order] = option.split(':');
    return {
      field: field as SortField,
      order: order as SortOrder,
    };
  });
}

// TODO: (20241107 - Shirley) 排序資料
function sortData<T>(data: T[], sortOptions: Array<{ field: keyof T; order: SortOrder }>): T[] {
  if (!sortOptions.length) return data;
  return [...data].sort((a, b) => {
    return sortOptions.reduce((acc, { field, order }) => {
      if (acc !== 0) return acc;
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

// TODO: (20241107 - Shirley) 過濾資料
function filterData<T extends Asset>(data: T[], filters?: AssetExportRequestBody['filters']): T[] {
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

// TODO: (20241107 - Shirley) 選擇欄位
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

// TODO: (20241107 - Shirley) 處理資產匯出
async function handleAssetExport(
  req: NextApiRequest,
  res: NextApiResponse,
  body: AssetExportRequestBody
): Promise<void> {
  try {
    const { companyId } = req.query;
    if (!companyId || typeof companyId !== 'string') {
      throw new Error('Invalid companyId');
    }

    const { exportType, fileType, filters, sortOption, options } = body;

    // 驗證必要參數
    if (!exportType || !fileType) {
      throw new Error('Missing required fields');
    }

    // 驗證 exportType
    if (exportType !== 'assets') {
      throw new Error('Invalid export type for handleAssetExport');
    }

    // 驗證 fileType
    if (!['csv'].includes(fileType)) {
      throw new Error('Invalid file type');
    }

    // TODO: (20241107 - Shirley) 從資料庫獲取資產資料
    let assets: Asset[] = MOCK_ASSETS;

    if (filters) {
      assets = filterData(assets, filters);
    }

    if (sortOption) {
      const sortOptionsParsed = parseSortOptions(sortOption);
      assets = sortData(assets, sortOptionsParsed);
    }

    if (options && options.fields) {
      assets = selectFields(assets, options.fields as (keyof Asset)[]) as Asset[];
    }

    // TODO: (20241107 - Shirley) 處理時區轉換 (暫未實作)
    const newData = assets.map((asset) => ({
      ...asset,
      // acquisitionDate: timezone
      //   ? convertTimestampToDateBasedOnTimezone(asset.acquisitionDate, timezone)
      //   : asset.acquisitionDate,
    }));

    const fields: (keyof Asset)[] = (options?.fields as (keyof Asset)[]) || ASSET_FIELDS;

    const csv = convertToCSV<Record<keyof Asset, Asset[keyof Asset]>>(fields, newData as Asset[]);
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
    body: ExportRequestBody
  ) => Promise<void>;
} = {
  POST: async (req, res, body) => {
    switch (body.exportType) {
      case ExportType.ASSETS:
        await handleAssetExport(req, res, body as AssetExportRequestBody);
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
      const body = req.body as ExportRequestBody;
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
