import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountProgressStatus } from '@/interfaces/account';
import { ResponseType } from '@/interfaces/api_response';
import version from '@/lib/version';
import VoucherService from '../voucher.service';

interface ResponseData extends ResponseType<AccountProgressStatus> {}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const voucherService = VoucherService.getInstance();
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

  switch (req.method) {
    case 'GET': {
      const result = voucherService.getVoucherAnalyzingStatus(resultId);
      return res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '200',
        message: `Voucher preview creating process of id:${resultId} return successfully`,
        payload: result,
      });
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'Method Not Allowed in get Voucher preview creating process api',
      });
    }
  }
}
