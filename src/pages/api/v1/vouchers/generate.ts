import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountResultStatus, isAccountVoucher } from '@/interfaces/account';
import version from '@/lib/version';
import { ResponseType } from '@/interfaces/api_response';

interface ResponseData extends ResponseType<AccountResultStatus> {}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  // Todo Murky (20240416): Get Images and check if Image exist
  const { voucher } = req.body;

  switch (req.method) {
    case 'POST': {
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
        message: 'Method Not Allowed in voucher preview api',
      });
    }
  }
}
