import { NextApiRequest, NextApiResponse } from 'next';
import { IPayment } from '@/interfaces/payment';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_CODE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPayment | IPayment[]>>
) {
  try {
    // Info: (20240419 - Jacky) P010001 - GET /payment
    if (!req.headers.userid) {
      throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
    }
    if (req.method === 'GET') {
      const paymentList: IPayment[] = [
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
      const { httpCode, result } = formatApiResponse<IPayment[]>(
        STATUS_CODE.SUCCESS_LIST,
        paymentList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) P010003 - POST /payment
    } else if (req.method === 'POST') {
      const { type, no, expireYear, expireMonth, cvc, name } = req.body;
      if (!type || !no || !expireYear || !expireMonth || !cvc || !name) {
        throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
      }
      const newPayment: IPayment = {
        id: '3',
        type,
        no,
        expireYear,
        expireMonth,
        cvc,
        name,
      };
      const { httpCode, result } = formatApiResponse<IPayment>(STATUS_CODE.CREATED, newPayment);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_CODE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IPayment>(error.message, {} as IPayment);
    res.status(httpCode).json(result);
  }
}
