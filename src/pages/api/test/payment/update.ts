import loggerBack from '@/lib/utils/logger_back';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { ordernumber, retcode, amount, authCode } = req.body;

  if (!ordernumber || !retcode) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  loggerBack.info(
    `訂單號碼: ${ordernumber}, 金額: ${amount}, 交易結果: ${retcode}, 授權碼: ${authCode}`
  );

  if (retcode === '00') {
    loggerBack.info(`✅ 訂單 ${ordernumber} 付款成功！`);
    // TODO: 更新資料庫訂單狀態為「已付款」
  } else {
    loggerBack.info(`❌ 訂單 ${ordernumber} 付款失敗，錯誤碼：${retcode}`);
    // TODO: 記錄錯誤資訊，允許使用者重新付款
  }

  // **重要：回應 "R01=00"，避免 HiTRUST 重複通知**
  return res.send('R01=00');
}
