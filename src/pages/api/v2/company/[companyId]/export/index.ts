/* eslint-disable */
import { STATUS_MESSAGE } from '@/constants/status_code';
import { timestampInSeconds } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

interface ExportRequestBody {
  exportType: string;
  fileType: 'csv';
  type?: string;
  status?: string;
  startDate?: number;
  endDate?: number;
  searchQuery?: string;
  sortOption?: string;
  language?: string;
  timezone?: string;
}

// 模擬資產資料
const MOCK_ASSETS = [
  {
    name: '辦公桌',
    acquisitionDate: 1530959244,
    purchasePrice: 300000,
    accumulatedDepreciation: 5000,
    residualValue: 25000,
    remainingLife: 10000000,
  },
  {
    name: '滑鼠',
    acquisitionDate: 1530959244,
    purchasePrice: 200000,
    accumulatedDepreciation: 5000,
    residualValue: 15000,
    remainingLife: 10000000,
  },
  {
    name: '筆電',
    acquisitionDate: 1630959244,
    purchasePrice: 30000,
    accumulatedDepreciation: 5000,
    residualValue: 25000,
    remainingLife: 1000000,
  },
  {
    name: '手機',
    acquisitionDate: 1730959244,
    purchasePrice: 10000,
    accumulatedDepreciation: 2000,
    residualValue: 8000,
    remainingLife: 10000,
  },
];

// 將物件陣列轉換為 CSV 字串
function convertToCSV(fields: string[], data: any[]) {
  // 產生表頭
  const header = fields.join(',') + '\n';

  // 產生資料行
  const rows = data
    .map((item) => {
      return fields
        .map((field) => {
          const value = item[field];
          // 處理包含逗號、換行或雙引號的值
          if (
            typeof value === 'string' &&
            (value.includes(',') || value.includes('\n') || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',');
    })
    .join('\n');

  return header + rows;
}

// 定義排序欄位類型
type SortField =
  | 'acquisitionDate'
  | 'purchasePrice'
  | 'accumulatedDepreciation'
  | 'residualValue'
  | 'remainingLife';
type SortOrder = 'asc' | 'desc';

// 解析排序選項
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

// 排序資料
function sortData(data: any[], sortOptions: Array<{ field: SortField; order: SortOrder }>) {
  if (!sortOptions.length) return data;

  return [...data].sort((a, b) => {
    for (const { field, order } of sortOptions) {
      if (a[field] === b[field]) continue;

      const multiplier = order === 'asc' ? 1 : -1;
      if (typeof a[field] === 'string') {
        return multiplier * a[field].localeCompare(b[field]);
      }
      return multiplier * (a[field] - b[field]);
    }
    return 0;
  });
}

// export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     const {
//       exportType,
//       type,
//       status,
//       startDate,
//       endDate,
//       searchQuery,
//       sortOption,
//       language = 'zh-TW',
//       timezone = '+0800',
//     } = req.query;

//     // 驗證必要參數
//     if (!exportType) {
//       res.status(400).json({ message: 'Missing required fields' });
//       return;
//     }

//     // 驗證 exportType
//     if (exportType !== 'assets') {
//       res.status(400).json({ message: 'Invalid export type' });
//       return;
//     }

//     // ToDo: 從資料庫獲取資產資料
//     let newData: any[] = [];
//     let assets = MOCK_ASSETS;

//     // 處理排序
//     if (sortOption) {
//       const sortOptions = parseSortOptions(sortOption as string);
//       assets = sortData(assets, sortOptions);

//       console.log('sortOption', sortOption);
//     }

//     if (timezone) {
//       newData = assets.map((asset) => ({
//         ...asset,
//         // acquisitionDate: convertTimestampToDateBasedOnTimezone(
//         //   asset.acquisitionDate,
//         //   timezone as string
//         // ),
//       }));
//     }

//     const fields = [
//       'acquisitionDate',
//       'name',
//       'purchasePrice',
//       'accumulatedDepreciation',
//       'residualValue',
//       'remainingLife',
//     ];
//     const csv = convertToCSV(fields, newData);

//     res.setHeader('Content-Type', 'text/csv; charset=utf-8');
//     res.setHeader('Content-Disposition', `attachment; filename=assets_${Date.now()}.csv`);
//     res.send(csv);
//   } catch (error) {
//     res.status(500).json({ message: 'Internal server error' });
//   }
// }

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method === 'GET') {
//     return handleGetRequest(req, res);
//   }
//   res.status(405).json({ message: 'Method not allowed' });
// }

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = req.body as ExportRequestBody;
    const {
      exportType,
      fileType,
      type,
      status,
      startDate,
      endDate,
      searchQuery,
      sortOption,
      language = 'zh-TW',
      timezone = '+0800',
    } = body;

    // 驗證必要參數
    if (!exportType || !fileType) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // 驗證 exportType
    if (exportType !== 'assets') {
      res.status(400).json({ message: 'Invalid export type' });
      return;
    }

    // 驗證 fileType
    if (!['csv'].includes(fileType)) {
      res.status(400).json({ message: 'Invalid file type' });
      return;
    }

    // ToDo: 從資料庫獲取資產資料
    let assets = MOCK_ASSETS;

    // 處理排序
    if (sortOption) {
      const sortOptions = parseSortOptions(sortOption);
      assets = sortData(assets, sortOptions);
    }

    // 處理時區轉換
    const newData = assets.map((asset) => ({
      ...asset,
      // acquisitionDate: timezone
      //   ? convertTimestampToDateBasedOnTimezone(asset.acquisitionDate, timezone)
      //   : asset.acquisitionDate,
    }));

    const fields = [
      'acquisitionDate',
      'name',
      'purchasePrice',
      'accumulatedDepreciation',
      'residualValue',
      'remainingLife',
    ];

    const fileName = `assets_${Date.now()}.${fileType}`;

    if (fileType === 'csv') {
      const csv = convertToCSV(fields, newData);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.send(csv);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handlePostRequest(req, res);
  }
  res.status(405).json({ message: 'Method not allowed' });
}
