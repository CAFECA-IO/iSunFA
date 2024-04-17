import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  message: string;
  errorReason?: string;
  status: 'success' | 'error' | 'inProgress';
};

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
