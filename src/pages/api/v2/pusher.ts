import type { NextApiRequest, NextApiResponse } from 'next';
import Pusher from 'pusher';

// Info: (20241004-tzuhan) 初始化 Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  host: process.env.NEXT_PUBLIC_PUSHER_HOST!,
  useTLS: process.env.PUSHER_USE_TLS === 'true',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { certificates } = req.body;

    // eslint-disable-next-line no-console
    console.log('certificates:', certificates);

    // Info: (20241004-tzuhan) 發送圖片 URL 給其他訂閱者
    try {
      await Promise.all(
        certificates.map(async (certificate: { url: string; token: string }) => {
          await pusher.trigger('certificate-channel', 'certificate-event', {
            url: certificate.url,
            token: certificate.token,
          });
        })
      );
      res.status(200).json({ status: 'Certificate sent successfully' });
    } catch (error) {
      res.status(500).json({ status: 'Failed to send certificates', error });
    }
  } else {
    res.status(405).send('Method not allowed');
  }
}
