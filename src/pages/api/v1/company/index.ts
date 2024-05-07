import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!req.headers.userId) {
      throw new Error('RESOURCE_NOT_FOUND');
    }
    if (req.method === 'GET') {
      // Handle GET request to retrieve all companies
      // Your code here...
    } else if (req.method === 'POST') {
      // Handle POST request to create a new company
      // Your code here...
    } else {
      throw new Error('METHOD_NOT_ALLOWED');
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
