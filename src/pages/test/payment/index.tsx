import { useEffect, useState } from 'react';

const PaymentPage = () => {
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    // 生成唯一的訂單編號 (UUID)
    const generatedOrderNumber = `ORDER${Date.now().toString().slice(-10)}`;
    setOrderNumber(generatedOrderNumber);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="mb-4 text-xl font-semibold">信用卡支付測試</h2>

      {/* 顯示測試資訊 */}
      <div className="mb-4 rounded border bg-gray-100 p-4 text-left">
        <p>
          <strong>訂單號碼：</strong> {orderNumber}
        </p>
        <p>
          <strong>交易金額：</strong> {10} 元
        </p>
        <p>
          <strong>訂單描述：</strong> 測試交易
        </p>
      </div>

      {/* 交易表單 */}
      <form method="POST" action="https://testtrustlink.hitrust.com.tw/TrustLink/TrxReqForJava">
        <input type="hidden" name="Type" value="Auth" />
        <input type="hidden" name="storeid" value="62695" />
        <input type="hidden" name="ordernumber" value={orderNumber} />
        <input type="hidden" name="amount" value={1000} /> {/* 訂單金額 (10元 = 1000) */}
        <input type="hidden" name="orderdesc" value="測試交易" /> {/* 限制 40 英文 / 20 中文 */}
        <input type="hidden" name="depositflag" value="1" /> {/* 1 = 自動請款 */}
        <input type="hidden" name="queryflag" value="1" /> {/* 1 = 回傳詳細資料 */}
        <input type="hidden" name="returnURL" value="https://isunfa.tw/test/payment/result" />
        <input
          type="hidden"
          name="merUpdateURL"
          value="https://isunfa.tw/api/test/payment/update"
        />
        <button type="submit" className="rounded bg-blue-500 px-6 py-2 text-white">
          前往支付
        </button>
      </form>
    </div>
  );
};

export default PaymentPage;
