import { NextApiRequest, NextApiResponse } from 'next';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { error } = req.query;
    loggerBack.error(`Authentication Error: ${error}`);
    return res.status(500).json({ message: `Authentication Error: ${error}` });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.GUEST,
      errorType: 'Internal Server Error, handler auth error failed',
      errorMessage: (error as Error).message,
    });
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
