import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertToCSV } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';

// TODO: (20241203 - Shirley) 模擬資料
const MOCK_TRIAL_BALANCE = [
  {
    accountingTitle: '現金',
    beginningCreditAmount: 0,
    beginningDebitAmount: 100000,
    midtermCreditAmount: 50000,
    midtermDebitAmount: 30000,
    endingCreditAmount: 0,
    endingDebitAmount: 80000,
  },
  {
    accountingTitle: '應付帳款',
    beginningCreditAmount: 50000,
    beginningDebitAmount: 0,
    midtermCreditAmount: 20000,
    midtermDebitAmount: 30000,
    endingCreditAmount: 40000,
    endingDebitAmount: 0,
  },
];

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    // TODO: (20241203 - Shirley) implement the param and query validation when dev the API
    // Deprecated: (20241214 - Shirley) remove the unused params
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fileType, filters, sort, options } = req.body;

    if (!fileType) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // TODO: (20241203 - Shirley) 從資料庫獲取資產資料
    const data = MOCK_TRIAL_BALANCE;

    // TODO: (20241203 - Shirley) 處理欄位選擇
    const fields = options?.fields || [
      'accountingTitle',
      'beginningCreditAmount',
      'beginningDebitAmount',
      'midtermCreditAmount',
      'midtermDebitAmount',
      'endingCreditAmount',
      'endingDebitAmount',
    ];

    const FIELD_NAME_MAP = {
      accountingTitle: '會計科目',
      beginningCreditAmount: '期初借方餘額',
      beginningDebitAmount: '期初貸方餘額',
      midtermCreditAmount: '期中借方餘額',
      midtermDebitAmount: '期中貸方餘額',
      endingCreditAmount: '期末借方餘額',
      endingDebitAmount: '期末貸方餘額',
    };

    const csv = convertToCSV(fields, data, FIELD_NAME_MAP);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=trial_balance_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handlePostRequest(req, res);
  }
  return res.status(405).json({ message: STATUS_MESSAGE.METHOD_NOT_ALLOWED });
}
