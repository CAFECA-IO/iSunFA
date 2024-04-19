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
      const client = {
        id: '1',
        name: 'cafeca',
        code: '1234',
        favorite: false,
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'list all clients',
        payload: client,
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
      const { name, code } = req.body;
      const client = {
        id: '1',
        name: 'cafeca',
        code: '1234',
        favorite: false,
      };
      client.name = name;
      client.code = code;
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create client',
        payload: client,
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
      const client = {
        id: '1',
        name: 'cafeca',
        code: '1234',
        favorite: false,
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'delete ' + client.id + ' client',
        payload: client,
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
