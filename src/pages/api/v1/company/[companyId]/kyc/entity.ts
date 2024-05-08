import { STATUS_CODE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<string>>) {
  try {
    // Info: (20240419 - Jacky) K012001 - POST /kyc/entity
    if (req.method === 'POST') {
      if (!req.headers.userId) {
        throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { formData } = req.body;
      // Process the form data
      const status = 'Entity KYC is under review';
      const { httpCode, result } = formatApiResponse<string>(STATUS_CODE.CREATED, status);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_CODE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<string>(error.message, {} as string);
    res.status(httpCode).json(result);
  }
}
