import { NextApiRequest, NextApiResponse } from 'next';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { error } = req.query;
    loggerBack.error(`Authentication Error: ${error}`);
    return res.status(500).json({ message: `Authentication Error: ${error}` });
  } catch (error) {
    const logError = loggerError(
      0,
      'Internal Server Error, handler auth error failed',
      error as Error
    );
    logError.error('handle auth error failed in handler function in auth/error.ts');
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
