import { getPusherInstance } from '@/lib/utils/pusher';
import { NextApiRequest, NextApiResponse } from 'next';

const pusher = getPusherInstance();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { socketId, channelName } = req.body;

    // Info: (20241119 - tzuhan) 簡單權限檢查 (可以擴展檢查用戶身份或權限)
    if (!socketId || !channelName) {
      return res.status(400).json({ error: 'Missing socket_id or channel_name' });
    }

    try {
      // Info: (20241119 - tzuhan) 使用 Pusher 簽署授權請求
      const auth = pusher.authorizeChannel(socketId, channelName);
      return res.status(200).json(auth);
    } catch (error) {
      // Deprecate: (20241119 - tzuhan) debug purpose
      // eslint-disable-next-line no-console
      console.error('Pusher authorization error:', error);
      return res.status(500).json({ error: 'Authorization failed' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
