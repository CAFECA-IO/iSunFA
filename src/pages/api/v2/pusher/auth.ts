import { HttpMethod } from '@/constants/api_connection';
import { getPusherInstance } from '@/lib/utils/pusher';
import { NextApiRequest, NextApiResponse } from 'next';

const pusher = getPusherInstance();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === HttpMethod.POST) {
    try {
      // Info: (20241120 - tzuhan) 獲取原始請求體
      const rawBody = await new Promise<string>((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
          data += chunk;
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });

      // Info: (20241120 - tzuhan) 解析 `application/x-www-form-urlencoded` 格式的請求體
      const parsedBody = rawBody.split('&').reduce(
        (acc, pair) => {
          const [key, value] = pair.split('=').map(decodeURIComponent); // Info: (20241120 - tzuhan) 解碼 URL 編碼
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      const socketId = parsedBody.socket_id;
      const channelName = parsedBody.channel_name;

      // Info: (20241120 - tzuhan) 驗證必要參數
      if (!socketId || !channelName) {
        return res.status(400).json({ error: 'Missing socketId or channelName' });
      }

      // Info: (20241120 - tzuhan) 使用 Pusher 驗證
      const authResponse = pusher.authorizeChannel(socketId, channelName);

      // Info: (20241120 - tzuhan) 返回授權結果
      return res.status(200).json(authResponse);
    } catch (error) {
      (error as Error).message += ` | Method: ${req.method} | Path: ${req.url}`;
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    // Info: (20241120 - tzuhan) 如果不是 POST，返回 405 Method Not Allowed
    res.setHeader('Allow', [HttpMethod.POST]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
