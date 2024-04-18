import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountResultStatus, isAccountInvoiceData } from '@/interfaces/account';
import { ResponseType } from '@/interfaces/api_response';
import version from '@/lib/version';

interface ResponseData extends ResponseType<AccountResultStatus[]> {}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  // Todo Murky (20240416): Get Images and check if Image exist
  const { invoices } = req.body;

  switch (req.method) {
    case 'POST': {
      // Info Murky (20240416): Check if invoices is array and is Invoice type
      if (!Array.isArray(invoices) || invoices.some((invoice) => !isAccountInvoiceData(invoice))) {
        return res.status(400).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '400',
          message: 'Invalid invoices',
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
        message: 'Invoices Data uploaded successfully',
        payload: [data],
      };

      return res.status(200).json(response);
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'Method Not Allowed in ocr get result api',
      });
    }
  }
}
