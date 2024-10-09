import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { encrypt } from '@/lib/utils/pusher_token';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: string = '';
  try {
    if (req.method === 'POST') {
      const { companyId } = req.body;
      const token = encrypt(companyId.toString());
      statusMessage = STATUS_MESSAGE.SUCCESS;
      payload = token;
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (error) {
    statusMessage = (error as Error).message;
  } finally {
    const { httpCode, result } = formatApiResponse<string>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
