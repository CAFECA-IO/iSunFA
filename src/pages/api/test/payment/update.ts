import { NextApiRequest, NextApiResponse } from 'next';
import qs from 'querystring';

/**
 * 取得 `POST` 原始資料 (解決 Next.js 無法解析 `application/x-www-form-urlencoded` 的問題)
 */
function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let body = Buffer.alloc(0);

    req.on('data', (chunk) => {
      body = Buffer.concat([body, chunk]);
    });

    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 解析 `application/x-www-form-urlencoded` 格式的 `POST` 請求
    const rawBody = await getRawBody(req);
    const parsedBody = qs.parse(rawBody.toString());

    // eslint-disable-next-line no-console
    console.log('🔍 HiTRUST `POST` Data:', parsedBody);

    // 檢查是否缺少必要的參數
    if (!parsedBody.ordernumber || !parsedBody.retcode) {
      return res.status(400).json({ message: 'Missing required parameters', received: parsedBody });
    }

    return res.json({ message: 'Payment update received', received: parsedBody });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ 錯誤解析 HiTRUST `POST`:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
