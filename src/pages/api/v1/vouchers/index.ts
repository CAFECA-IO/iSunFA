import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountResultStatus, AccountVoucher, isAccountVoucher } from '@/interfaces/account';
import version from '@/lib/version';
import { ResponseType } from '@/interfaces/api_response';

interface ResponseData extends ResponseType<AccountVoucher[] | AccountResultStatus> {}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  // Todo Murky (20240416): Get Images and check if Image exist
  switch (req.method) {
    case 'GET': {
      let { page = 1, limit = 10 } = req.query;
      page = Number(page);
      limit = Number(limit);
      // Info Murky (20240416): Check if page and limit are positive integers
      if (Number.isNaN(page) || page < 1 || Number.isNaN(limit) || limit < 1) {
        return res.status(400).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '400',
          message: 'Invalid page or limit, must be positive integer number',
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
        success: true,
        code: '200',
        message: 'List of vouchers return successfully',
        payload: [mockVoucherData],
      });
    }
    case 'POST': {
      // Todo Murky (20240416): Get Images and check if Image exist
      const { voucher } = req.body;
      // Info Murky (20240416): Check if voucher is valid
      if (Array.isArray(voucher) || !isAccountVoucher(voucher)) {
        return res.status(400).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '400',
          message: 'Invalid voucher',
        });
      }

      const data: AccountResultStatus = {
        resultId: '1229001',
        status: 'success',
      };

      const response: ResponseData = {
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: 'Voucher is successfully generated',
        payload: data,
      };

      return res.status(200).json(response);
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
