import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountLineItem, AccountProgressStatus } from '@/interfaces/account';

type ResponseData = {
  message: AccountProgressStatus;
  errorReason?: string;
  data?: AccountLineItem;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { lineItemId } = req.query;

  // Info Murky (20240416): Check if lineItemId is string
  if (typeof lineItemId !== 'string' || !lineItemId || Array.isArray(lineItemId)) {
    return res.status(400).json({
      message: 'error',
      errorReason: 'Invalid lineItemId',
    });
  }
  // Todo Murky (20240416): Get Images and check if Image exist
  switch (req.method) {
    case 'GET': {
      const mockLineItemData: AccountLineItem = {
        lineItemIndex: '1229001001',
        account: '銀行存款',
        description: '港幣120000 * 3.916',
        debit: true,
        amount: 469920,
      };
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
