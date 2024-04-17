import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AccountProgressStatus,
  AccountResultStatus,
  isAccountInvoiceData,
} from '@/interfaces/account';

type ResponseData = {
  message: AccountProgressStatus;
  errorReason?: string;
  data?: AccountResultStatus;
};

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  // Todo Murky (20240416): Get Images and check if Image exist
  const { invoices } = req.body;

  switch (req.method) {
    case 'POST': {
      // Info Murky (20240416): Check if invoices is array and is Invoice type
      if (!Array.isArray(invoices) || invoices.some((invoice) => !isAccountInvoiceData(invoice))) {
        return res.status(400).json({
          message: 'error',
          errorReason: 'Invalid invoices',
        });
      }

      const status = 'success' as AccountProgressStatus;
      const data: AccountResultStatus = {
        resultId: '1229001',
        status: 'success',
      };

      const response: ResponseData = {
        message: status,
        data,
      };

      return res.status(200).json(response);
    }
    default: {
      return res.status(405).json({
        message: 'error',
        errorReason: 'Method Not Allowed',
      });
    }
  }
}
