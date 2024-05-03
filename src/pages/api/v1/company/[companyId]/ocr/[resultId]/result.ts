// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountInvoiceData } from '@/interfaces/account';
import { ResponseType } from '@/interfaces/api_response';
import version from '@/lib/version';

interface ResponseData extends ResponseType<AccountInvoiceData[]> {}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { resultId } = req.query;
  // Info Murky (20240416): Check if resultId is string
  if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
    return res.status(400).json({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Invalid resultId',
    });
  }

  switch (req.method) {
    case 'GET': {
      const ocrResultData: AccountInvoiceData = {
        date: {
          start_date: 124214,
          end_date: 124214,
        },
        eventType: 'income',
        paymentReason: '勞務收入',
        venderOrSupplyer: 'Isuncloud Limited',
        description: '技術開發軟件與服務',
        payment: {
          price: 469920,
          hasTax: true,
          taxPercentage: 25,
          hasFee: false,
          fee: 0,
        },
      };
      return res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: `OCR analyzing result of id:${resultId} return successfully`,
        payload: [ocrResultData],
      });
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'Method Not Allowed in ocr get result api',
      });
    }
  }
}
