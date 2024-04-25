import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountVoucher } from '@/interfaces/account';
import version from '@/lib/version';
import { ResponseType } from '@/interfaces/api_response';

interface ResponseData extends ResponseType<AccountVoucher> {}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { resultId } = req.query;

  // Info Murky (20240416): Check if resultId is string
  if (typeof resultId !== 'string' || !resultId || Array.isArray(resultId)) {
    return res.status(400).json({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Invalid resultId',
    });
  }
  // Todo Murky (20240416): Get Images and check if Image exist
  switch (req.method) {
    case 'GET': {
      // 請幫我生一個假的 AccountVoucher
      const mockVoucherData: AccountVoucher = {
        voucherIndex: '1229001001',
        metadatas: [
          {
            date: 1630454400000,
            paymentMethod: 'visa',
            venderOrSupplyer: 'Apple',
            description: 'Macbook Pro 2021',
            totalPrice: 469920,
            taxPercentage: 0,
            fee: 0,
            paymentPeriod: 'atOnce',
            installmentPeriod: 0,
            paymentStatus: 'paid',
            voucherType: 'expense',
            alreadyPaidAmount: 469920,
          },
        ],
        lineItems: [
          {
            lineItemIndex: '1229001001',
            accounting: '銀行存款',
            particular: '港幣120000 * 3.916',
            debit: true,
            amount: 469920,
          },
          {
            lineItemIndex: '1229001002',
            accounting: '營業收入',
            particular: '港幣120000 * 3.916',
            debit: false,
            amount: 469920,
          },
        ],
      };
      return res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: 'List of vouchers return successfully',
        payload: mockVoucherData,
      });
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'Method Not Allowed in vouchers api',
      });
    }
  }
}
