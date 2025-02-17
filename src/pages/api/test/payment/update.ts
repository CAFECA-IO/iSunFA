import loggerBack from '@/lib/utils/logger_back';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  loggerBack.info(
    `📌 收到 HiTRUSTpay Webhook:", ${JSON.stringify(req.method)}, ${JSON.stringify(req.query)}, ${JSON.stringify(req.body)}`
  );

  // 交易類型 (GET 或 POST 皆可能回傳)
  const params = req.method === 'GET' ? req.query : req.body;
  const {
    type,
    ordernumber,
    retcode,
    storeid,
    currency,
    authCode,
    authRRN,
    orderstatus,
    approveamount,
    depositamount,
    credamount,
    orderdate,
    capDate,
    creddate,
    credcode,
    credRRN,
    eci,
    trxStatusCode,
    trxToken,
    pan,
  } = params;

  // 需要透過 GET 回傳的交易類型
  const GET_METHOD_TYPES = [
    'AuthSSL',
    'AuthRe',
    'Capture',
    'CaptureRe',
    'Refund',
    'RefundRe',
    'Query',
  ];
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
    🔹 商店代碼: ${storeid || 'N/A'}
    🔹 貨幣: ${currency || 'N/A'}
    🔹 授權碼: ${authCode || 'N/A'}
    🔹 銀行調單編號: ${authRRN || 'N/A'}
    🔹 訂單狀態: ${orderstatus || 'N/A'}
    🔹 核准金額: ${approveamount || 'N/A'}
    🔹 入帳金額: ${depositamount || 'N/A'}
    🔹 退款金額: ${credamount || 'N/A'}
    🔹 訂單建立時間: ${orderdate || 'N/A'}
    🔹 請款時間: ${capDate || 'N/A'}
    🔹 退款時間: ${creddate || 'N/A'}
    🔹 退款授權碼: ${credcode || 'N/A'}
    🔹 退款調單編號: ${credRRN || 'N/A'}
    🔹 交易 ECI (3D 驗證狀態): ${eci || 'N/A'}
    🔹 交易狀態碼: ${trxStatusCode || 'N/A'}
    🔹 交易 Token: ${trxToken || 'N/A'}
    🔹 信用卡號 (遮蔽後): ${pan || 'N/A'}
  `);

  // **重要**：回應 `R01=00` 避免 HiTRUSTpay 重發 Webhook
  return res.status(200).send('R01=00');
}
