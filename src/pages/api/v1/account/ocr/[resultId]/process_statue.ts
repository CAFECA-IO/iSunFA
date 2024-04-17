// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountProgressStatus } from '@/interfaces/account';

interface ResponseData {
  message: string;
  errorReason?: string;
  status: AccountProgressStatus;
}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { resultId } = req.query;

  // Info Murky (20240416): Check if resultId is string
  if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
    return res.status(400).json({
      message: 'error',
      errorReason: 'Invalid resultId',
      status: 'error',
    });
  }

  switch (req.method) {
    case 'GET': {
      return res.status(200).json({
        message: 'success',
        status: 'success',
      });
    }
    default: {
      return res.status(405).json({
        message: 'error',
        errorReason: 'Method Not Allowed',
        status: 'error',
      });
    }
  }
}
