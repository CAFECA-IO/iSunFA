import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountLineItem } from '@/interfaces/account';
import version from '@/lib/version';
import { ResponseType } from '@/interfaces/api_response';

interface ResponseData extends ResponseType<AccountLineItem> {}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { lineItemId } = req.query;

  // Info Murky (20240416): Check if lineItemId is string
  if (typeof lineItemId !== 'string' || !lineItemId || Array.isArray(lineItemId)) {
    return res.status(400).json({
      powerby: `ISunFa api ${version}`,
      success: false,
      code: '400',
      message: 'Invalid lineItemId',
    });
  }
  // Todo Murky (20240416): Get Images and check if Image exist
  switch (req.method) {
    case 'GET': {
      const mockLineItemData: AccountLineItem = {
        lineItemIndex: '1229001001',
        accounting: '銀行存款',
        particular: '港幣120000 * 3.916',
        debit: true,
        amount: 469920,
      };
      return res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: 'Line item return successfully',
        payload: mockLineItemData,
      });
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'METHOD_NOT_ALLOWED in line items api',
      });
    }
  }
}
