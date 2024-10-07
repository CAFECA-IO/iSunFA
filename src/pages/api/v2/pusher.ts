// /pages/api/pusher.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Pusher from 'pusher';

// Info: (20241004-tzuhan) 初始化 Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { images } = req.body;

    // Info: (20241004-tzuhan) 發送圖片 URL 給其他訂閱者
    try {
      await pusher.trigger('certificate-channel', 'certificate-event', {
        images,
      });
      res.status(200).json({ status: 'Certificate sent successfully' });
    } catch (error) {
      res.status(500).json({ status: 'Failed to send certificates', error });
    }
  } else {
    res.status(405).send('Method not allowed');
  }
}
