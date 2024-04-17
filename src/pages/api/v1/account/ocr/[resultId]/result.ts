import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountInvoiceData } from '@/interfaces/account';

interface ResponseData {
  message: string;
  errorReason?: string;
  data: AccountInvoiceData[];
}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { resultId } = req.query;
  // Info Murky (20240416): Check if resultId is string
  if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
    return res.status(400).json({
      message: 'error',
      errorReason: 'Invalid resultId',
      data: [],
    });
  }

  switch (req.method) {
    case 'GET': {
      const ocrResultData: AccountInvoiceData = {
        date: '2024-12-29',
        eventType: 'income',
        incomeReason: '勞務收入',
        client: 'Isuncloud Limited',
        description: '技術開發軟件與服務',
        price: '469920',
        tax: 'free',
        taxPercentange: 'null',
        fee: '0',
      };
      return res.status(200).json({
        message: 'success',
        data: [ocrResultData],
      });
    }
    default: {
      return res.status(405).json({
        message: 'error',
        errorReason: 'Method Not Allowed',
        data: [],
      });
    }
  }
}
