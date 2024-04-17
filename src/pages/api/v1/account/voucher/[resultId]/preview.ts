import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountVoucher } from '@/interfaces/account';

interface ResponseData {
  message: string;
  errorReason?: string;
  data?: AccountVoucher;
}

// Info Murky (20240416):  implement later
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function vouchIsReady(resultId: string) {
  return true;
}
export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { resultId } = req.query;

  // Info Murky (20240416): Check if resultId is string
  if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
    return res.status(400).json({
      message: 'error',
      errorReason: 'Invalid resultId',
    });
  }

  switch (req.method) {
    case 'GET': {
      const vouchIsReadyResult = await vouchIsReady(resultId);
      if (!vouchIsReadyResult) {
        return res.status(400).json({
          message: 'error',
          errorReason: 'Voucher is not ready yet',
        });
      }

      const mockVoucherData: AccountVoucher = {
        date: '2024-12-29',
        vouchIndex: '1229001',
        type: 'Receiving',
        from_or_to: 'Isuncloud Limited',
        description: '技術開發軟件與服務',
        document: [
          {
            documentIndex: '1229001001',
            account: '銀行存款',
            description: '港幣120000 * 3.916',
            debit: true,
            amount: 469920,
          },
          {
            documentIndex: '1229001002',
            account: '營業收入',
            description: '港幣120000 * 3.916',
            debit: false,
            amount: 469920,
          },
        ],
      };
      return res.status(200).json({
        message: 'success',
        data: mockVoucherData,
      });
    }
    default: {
      return res.status(405).json({
        message: 'error',
        errorReason: 'Method Not Allowed',
      });
    }
  }
}
