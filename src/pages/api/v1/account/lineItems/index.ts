import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountLineItem, AccountProgressStatus } from '@/interfaces/account';

type ResponseData = {
  message: AccountProgressStatus;
  errorReason?: string;
  data?: AccountLineItem[];
};

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
          message: 'error',
          errorReason: 'Invalid page or limit, must be positive integer number',
        });
      }
      const mockLineItemData: AccountLineItem[] = [
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
      ];
      return res.status(200).json({
        message: 'success',
        data: mockLineItemData,
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
