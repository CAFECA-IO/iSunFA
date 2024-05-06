import { IInvoice } from '@/interfaces/invoice';
import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoice>>
) {
  try {
    if (req.method === 'GET') {
      // Handle GET request to fetch all invoices
      const invoices: IInvoice[] = [
        {
          id: '1',
          date: {
            start_date: 21321321,
            end_date: 123123123,
          },
          eventType: 'expense',
          paymentReason: 'purchase',
          description: 'description',
          venderOrSupplyer: 'vender',
          payment: {
            price: 100,
            hasTax: true,
            taxPercentage: 10,
            hasFee: true,
            fee: 10,
          },
        },
        {
          id: '2',
          date: {
            start_date: 21321321,
            end_date: 123123123,
          },
          eventType: 'income',
          paymentReason: 'sale',
          description: 'description',
          venderOrSupplyer: 'vender',
          payment: {
            price: 100,
            hasTax: true,
            taxPercentage: 10,
            hasFee: true,
            fee: 10,
          },
        },
      ];

      res.status(200).json({
        powerby: 'iSunFA v' + version,
        success: true,
        code: '200',
        message: 'request successful',
        payload: invoices,
      });
    } else if (req.method === 'POST') {
      // formdata invoice image
      // Handle POST request to create a new invoice
      const newInvoice: IInvoice = {
        id: '3',
        date: {
          start_date: 21321321,
          end_date: 123123123,
        },
        eventType: 'transfer',
        paymentReason: 'transfer',
        description: 'description',
        venderOrSupplyer: 'vender',
        payment: {
          price: 100,
          hasTax: true,
          taxPercentage: 10,
          hasFee: true,
          fee: 10,
        },
      };
      res.status(201).json({
        powerby: 'iSunFA v' + version,
        success: true,
        code: '201',
        message: 'create invoice successful',
        payload: newInvoice,
      });
    } else {
      throw new Error('Method not allowed');
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}
