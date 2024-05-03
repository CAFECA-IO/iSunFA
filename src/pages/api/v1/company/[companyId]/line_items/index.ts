import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountLineItem } from '@/interfaces/account';
import version from '@/lib/version';
import { ResponseType } from '@/interfaces/api_response';

interface ResponseData extends ResponseType<AccountLineItem[]> {}

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
      const mockLineItemData: AccountLineItem[] = [
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
      ];
      return res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: 'List of line items return successfully',
        payload: mockLineItemData,
      });
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'Method Not Allowed in line items api',
      });
    }
  }
}
