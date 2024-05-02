import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountVoucher } from '@/interfaces/account';
import { ResponseType } from '@/interfaces/api_response';
import version from '@/lib/version';

interface ResponseData extends ResponseType<AccountVoucher> {}

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
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Invalid resultId',
    });
  }

  switch (req.method) {
    case 'GET': {
      const vouchIsReadyResult = await vouchIsReady(resultId);
      if (!vouchIsReadyResult) {
        return res.status(400).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '400',
          message: 'Voucher is not ready yet',
        });
      }

      const mockVoucherData: AccountVoucher = {
        date: '2024-12-29',
        vouchIndex: '1229001',
        type: 'Receiving',
        from_or_to: 'Isuncloud Limited',
        description: '技術開發軟件與服務',
        lineItem: [
          {
            lineItemIndex: '1229001001',
            account: '銀行存款',
            description: '港幣120000 * 3.916',
            debit: true,
            amount: 469920,
          },
          {
            lineItemIndex: '1229001002',
            account: '營業收入',
            description: '港幣120000 * 3.916',
            debit: false,
            amount: 469920,
          },
        ],
      };
      return res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '200',
        message: `Voucher preview creating process of id:${resultId} return successfully`,
        payload: mockVoucherData,
      });
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'Method Not Allowed in voucher preview api',
      });
    }
  }
}
