import loggerBack from '@/lib/utils/logger_back';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  loggerBack.info(`📌 收到 HiTRUSTpay Webhook 回傳: ${JSON.stringify(req.body)}`);

  const {
    type,
    retcode,
    ordernumber,
    amount,
    orderstatus,
    authCode,
    eci,
    authRRN,
    trxToken,
    expiry,
  } = req.body;

  // 確保必要欄位存在
  if (!type || !retcode || !ordernumber || !amount) {
    loggerBack.error('❌ Webhook 回傳缺少必要參數');
    return res.status(400).json({ message: '缺少必要參數' });
  }

  // 記錄交易狀態
  loggerBack.info(`
    🔹 交易類型: ${type}
    🔹 訂單編號: ${ordernumber}
    🔹 交易金額: ${amount}
    🔹 交易結果: ${retcode}
    🔹 訂單狀態: ${orderstatus || 'N/A'}
    🔹 銀行授權碼: ${authCode || 'N/A'}
    🔹 授權方式 (ECI): ${eci || 'N/A'}
    🔹 銀行調單編號: ${authRRN || 'N/A'}
    🔹 交易序號標記 (trxToken): ${trxToken || 'N/A'}
    🔹 信用卡到期日: ${expiry || 'N/A'}
  `);

  // **重要**：回應 `R01=00` 避免 HiTRUSTpay 重發 Webhook
  return res.status(200).send('R01=00');
}
