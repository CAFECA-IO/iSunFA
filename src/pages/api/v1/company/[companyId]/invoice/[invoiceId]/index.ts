import { NextApiRequest, NextApiResponse } from 'next';
import { IInvoice } from '@/interfaces/invoice';
import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import version from '@/lib/version';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoice>>
) {
  try {
    const { invoiceId } = req.query;
    if (!invoiceId) {
      throw new Error('Invalid input parameter');
    }
    // Find the invoice with the given id
    const invoice = {
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
    };
    if (!invoice) {
      throw new Error('Resource not found');
    }

    res.status(200).json({
      powerby: 'iSunFA v' + version,
      success: true,
      code: '200',
      message: 'get invoice by id successful',
      payload: invoice,
    });
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
