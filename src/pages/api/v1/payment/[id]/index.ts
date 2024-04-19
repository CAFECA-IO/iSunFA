import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    if (method === 'GET') {
      if (!req.headers.userId) {
        throw new Error('Resource not found');
      }
      if (!req.query.id) {
        throw new Error('Invalid input parameter');
      }
      if (req.query.id !== '1') {
        throw new Error('Resource not found');
      }
      const payment = {
        id: '1',
        type: 'VISA',
        no: '1234-1234-1234-1234',
        expireYear: '29',
        expireMonth: '01',
        cvc: '330',
        name: 'Taiwan Bank',
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'list payment by id',
        payload: payment,
      });
    } else if (method === 'PUT') {
      if (!req.headers.userId) {
        throw new Error('Resource not found');
      }
      if (!req.query.id) {
        throw new Error('Invalid input parameter');
      }
      if (req.query.id !== '1') {
        throw new Error('Resource not found');
      }
      const { type, no, expireYear, expireMonth, cvc, name } = req.body;
      if (!type || !no || !expireYear || !expireMonth || !cvc || !name) {
        throw new Error('Invalid input parameter');
      }
      const payment = {
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'update payment by id',
        payload: payment,
      });
    } else if (method === 'DELETE') {
      if (!req.headers.userId) {
        throw new Error('Resource not found');
      }
      if (!req.query.id) {
        throw new Error('Invalid input parameter');
      }
      if (req.query.id !== '1') {
        throw new Error('Resource not found');
      }
      const payment = {
        id: '1',
        type: 'VISA',
        no: '1234-1234-1234-5678',
        expireYear: '29',
        expireMonth: '01',
        cvc: '330',
        name: 'Taiwan Bank',
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'delete payment ' + payment.id + ' successfully',
        payload: payment,
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
