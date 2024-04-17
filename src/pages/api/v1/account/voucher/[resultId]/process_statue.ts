import type { NextApiRequest, NextApiResponse } from 'next';

type OcrResultData = {
  date?: string;
  eventType?: string;
  incomeReason?: string;
  client?: string;
  description?: string;
  price?: string;
  tax?: string;
  taxPercentange?: string;
  fee?: string;
};

type ResponseData = {
  message: string;
  errorReason?: string;
  data: OcrResultData;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { resultId } = req.query;
  // Info Murky (20240416): Check if resultId is string
  if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
    return res.status(400).json({
      message: 'error',
      errorReason: 'Invalid resultId',
      data: {},
    });
  }

  switch (req.method) {
    case 'GET': {
      const data: OcrResultData = {
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
        data,
      });
    }
    default: {
      return res.status(405).json({
        message: 'error',
        errorReason: 'Method Not Allowed',
        data: {},
      });
    }
  }
}
