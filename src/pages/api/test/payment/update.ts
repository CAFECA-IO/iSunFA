import loggerBack from '@/lib/utils/logger_back';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  loggerBack.info(
    `📌 收到 HiTRUSTpay Webhook:", ${JSON.stringify(req.method)}, ${JSON.stringify(req.query)}, ${JSON.stringify(req.body)}`
  );

  // 交易類型 (GET 或 POST 皆可能回傳)
  const { type, ordernumber, retcode } = req.method === 'GET' ? req.query : req.body;

  // 需要透過 GET 回傳的交易類型
  const GET_METHOD_TYPES = ['AuthSSL', 'AuthRe', 'Capture', 'CaptureRe', 'Refund', 'RefundRe'];
  const POST_METHOD_TYPES = ['AUTH']; // 授權交易使用 POST 回傳

  if (req.method === 'POST') {
    if (!POST_METHOD_TYPES.includes(type as string)) {
      return res.status(405).json({
        message: `Method Not Allowed for this transaction type: ${JSON.stringify(req.method)}, ${JSON.stringify(req.query)}, ${JSON.stringify(req.body)}`,
      });
    }
  } else if (req.method === 'GET') {
    if (!GET_METHOD_TYPES.includes(type as string)) {
      return res.status(405).json({
        message: `Method Not Allowed for this transaction type: ${JSON.stringify(req.method)}, ${JSON.stringify(req.query)}, ${JSON.stringify(req.body)}`,
      });
    }
  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // 檢查必要參數
  if (!type || !ordernumber || !retcode) {
    loggerBack.error('❌ Webhook 回傳缺少必要參數');
    return res.status(400).json({ message: '缺少必要參數' });
  }

  // 記錄交易結果
  loggerBack.info(`
    🔹 交易類型: ${type}
    🔹 訂單編號: ${ordernumber}
    🔹 交易結果: ${retcode}
  `);

  // **重要**：回應 `R01=00` 避免 HiTRUSTpay 重發 Webhook
  return res.status(200).send('R01=00');
}
