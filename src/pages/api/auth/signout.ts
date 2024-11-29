import type { NextApiRequest, NextApiResponse } from 'next';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { handleSignOutSession } from '@/lib/utils/signout';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  loggerBack.info('custom signOut is called', req.body);
  if (req.method === 'POST') {
    try {
      await handleSignOutSession(req, res);
      res.status(200).json({ success: true, message: 'Successfully signed out' });
    } catch (error) {
      // Info: (20241127 - tzuhan) 錯誤處理
      loggerError(-1, 'sign-out failed', error as Error);
      const userFriendlyMessage = 'Failed to sign out';
      res
        .status(500)
        .json({ success: false, message: (error as Error).message || userFriendlyMessage });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
  return res;
}
