import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import type { ResponseData } from '../../../../../../type/iresponsedata';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    // Info: (20240419 - Jacky) P010001 - GET /payment
    if (!req.headers.userId) {
      throw new Error('Resource not found');
    }
    if (req.method === 'GET') {
      const paymentList = [
        {
          id: '1',
          type: 'VISA',
          no: '1234-1234-1234-1234',
          expireYear: '29',
          expireMonth: '01',
          cvc: '330',
          name: 'Taiwan Bank',
        },
        {
          id: '2',
          type: 'VISA',
          no: '5678-5678-5678-5678',
          expireYear: '29',
          expireMonth: '01',
          cvc: '355',
          name: 'Taishin International Bank',
        },
      ];
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'list all payments',
        payload: paymentList,
      });
      // Info: (20240419 - Jacky) P010003 - POST /payment
    } else if (req.method === 'POST') {
      const { type, no, expireYear, expireMonth, cvc, name } = req.body;
      if (!type || !no || !expireYear || !expireMonth || !cvc || !name) {
        throw new Error('Invalid input parameter');
      }
      const newPayment = {
        id: '3',
        type,
        no,
        expireYear,
        expireMonth,
        cvc,
        name,
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create payment',
        payload: newPayment,
      });
    } else {
      throw new Error('Method Not Allowed');
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
