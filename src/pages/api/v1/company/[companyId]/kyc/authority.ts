import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import version from '@/lib/version';
import { ResponseData } from '@/type/iresponsedata';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    // Info: (20240419 - Jacky) K011001 - POST /kyc/authority
    if (req.method === 'POST') {
      if (!req.headers.userId) {
        throw new Error('Resource not found');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { formData } = req.body;
      // Process the form data
      const status = 'Authority KYC is under review';
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create Authority KYC',
        payload: { status },
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
