import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICard } from '@/interfaces/card';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICard>>
) {
  const { method } = req;

  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (!req.query.id) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    if (req.query.id !== '1') {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    // Info: (20240419 - Jacky) P010002 - GET /payment/:id
    if (method === 'GET') {
      const payment: ICard = {
        id: '1',
        type: 'VISA',
        no: '1234-1234-1234-1234',
        expireYear: '29',
        expireMonth: '01',
        cvc: '330',
        name: 'Taiwan Bank',
      };
      const { httpCode, result } = formatApiResponse<ICard>(STATUS_MESSAGE.SUCCESS_GET, payment);
      res.status(httpCode).json(result);
    } else if (method === 'PUT') {
      const { type, no, expireYear, expireMonth, cvc, name } = req.body;
      if (!type || !no || !expireYear || !expireMonth || !cvc || !name) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const payment: ICard = {
        id: '3',
        type,
        no: '1234-1234-1234-1234',
        expireYear,
        expireMonth,
        cvc,
        name: 'Taiwan Bank',
      };
      payment.name = name;
      payment.no = no;
      const { httpCode, result } = formatApiResponse<ICard>(STATUS_MESSAGE.SUCCESS_UPDATE, payment);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) P010004 - DELETE /payment/:id
    } else if (method === 'DELETE') {
      const payment: ICard = {
        id: '1',
        type: 'VISA',
        no: '1234-1234-1234-5678',
        expireYear: '29',
        expireMonth: '01',
        cvc: '330',
        name: 'Taiwan Bank',
      };
      const { httpCode, result } = formatApiResponse<ICard>(STATUS_MESSAGE.SUCCESS_DELETE, payment);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ICard>(error.message, {} as ICard);
    res.status(httpCode).json(result);
  }
}
