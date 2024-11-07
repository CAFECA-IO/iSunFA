/* eslint-disable */
import { STATUS_MESSAGE } from '@/constants/status_code';
import { NextApiRequest, NextApiResponse } from 'next';

// 模擬資產資料
const MOCK_ASSETS = [
  {
    name: '辦公桌',
    acquisitionDate: 1630959244,
    purchasePrice: 300000,
    accumulatedDepreciation: 5000,
    residualValue: 25000,
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

export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      exportType,
      type,
      status,
      startDate,
      endDate,
      searchQuery,
      sortOption,
      language = 'zh-TW',
      timezone = '+0800',
    } = req.query;

    // 驗證必要參數
    if (!exportType) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // 驗證 exportType
    if (exportType !== 'assets') {
      res.status(400).json({ message: 'Invalid export type' });
      return;
    }

    // ToDo: 從資料庫獲取資產資料
    const assets = MOCK_ASSETS;

    const fields = [
      'acquisitionDate',
      'name',
      'purchasePrice',
      'accumulatedDepreciation',
      'residualValue',
      'remainingLife',
    ];
    const csv = convertToCSV(fields, assets);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=assets_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetRequest(req, res);
  }
  res.status(405).json({ message: 'Method not allowed' });
}
