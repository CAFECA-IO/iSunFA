import { HttpMethod } from '@/constants/api_connection';
import loggerBack from '@/lib/utils/logger_back';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  loggerBack.info(
    `📌 收到 HiTRUSTpay Webhook:", ${JSON.stringify(req.method)}, ${JSON.stringify(req.query)}, ${JSON.stringify(req.body)}`
  );

  // Info: (20250220 - Tzuhan) 交易類型 (GET 或 POST 皆可能回傳)
  const params = req.method === HttpMethod.GET ? req.query : req.body;
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

  // Info: (20250220 - Tzuhan) 需要透過 GET 回傳的交易類型
  const GET_METHOD_TYPES = [
    'AuthSSL',
    'AuthRe',
    'Capture',
    'CaptureRe',
    'Refund',
    'RefundRe',
    'Query',
  ];
  const POST_METHOD_TYPES = ['AUTH']; // Info: (20250220 - Tzuhan) 授權交易使用 POST 回傳

  if (req.method === HttpMethod.POST) {
    if (!POST_METHOD_TYPES.includes(type as string)) {
      return res.status(405).json({
        message: `Method Not Allowed for this transaction type: ${JSON.stringify(req.method)}, ${JSON.stringify(req.query)}, ${JSON.stringify(req.body)}`,
      });
    }
    // TODO: （20250220 - Tzuhan）要更新 IUserOwnedTeam 裡面的 plan 資料
    // TODO: （20250220 - Tzuhan）如果是 Auth 交易，要新增 Table 記錄
  } else if (req.method === HttpMethod.GET) {
    if (!GET_METHOD_TYPES.includes(type as string)) {
      return res.status(405).json({
        message: `Method Not Allowed for this transaction type: ${JSON.stringify(req.method)}, ${JSON.stringify(req.query)}, ${JSON.stringify(req.body)}`,
      });
    }
    // TODO: （20250220 - Tzuhan）如果是 Capture 或 Refund 交易，要記錄
  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Info: (20250220 - Tzuhan) 檢查必要參數
  if (!type || !ordernumber || !retcode) {
    loggerBack.error('❌ Webhook 回傳缺少必要參數');
    return res.status(400).json({ message: '缺少必要參數' });
  }

  // Info: (20250220 - Tzuhan) 記錄交易結果
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

  // Info: (20250220 - Tzuhan) **重要**：回應 `R01=00` 避免 HiTRUSTpay 重發 Webhook
  return res.status(200).send('R01=00');
}
