/* eslint-disable jsx-a11y/label-has-associated-control */
import { useEffect, useState } from 'react';

const HiTrustPaymentForm = () => {
  const generateOrderNumber = () => `ORDER${Date.now()}`;
  const [orderNumber, setOrderNumber] = useState(`ORDER${Date.now()}`);
  const [type, setType] = useState('Auth');
  const [depositFlag, setDepositFlag] = useState('1');
  const [queryFlag, setQueryFlag] = useState('1');
  const [amount, setAmount] = useState('10'); // 預設 10 元
  const [orderDesc, setOrderDesc] = useState('測試交易');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');

  // 當用戶選擇 `Auth` 或 `AuthSSL`，自動生成新的 `ordernumber`
  useEffect(() => {
    if (type === 'Auth' || type === 'AuthSSL') {
      setOrderNumber(generateOrderNumber());
    } else {
      setOrderNumber('');
    }
  }, [type]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // 轉換金額為「分」的單位 (10 元 = 1000)
    const amountInCents = Number(amount) * 100;
    if (!type) {
      alert('請選擇交易類型');
      e.preventDefault();
      return;
    }

    if (type !== 'Query' && (Number.isNaN(amountInCents) || amountInCents <= 0)) {
      alert('請輸入有效的交易金額');
      e.preventDefault();
      return;
    }

    if (type === 'AuthSSL' && (!cardNumber || !expiry)) {
      alert('請輸入卡號與有效期限');
      e.preventDefault();
      return;
    }

    if (
      ['AuthRe', 'Capture', 'CaptureRe', 'Refund', 'RefundRe', 'Query'].includes(type) &&
      !orderNumber
    ) {
      alert('請輸入訂單號碼');
      e.preventDefault();
      return;
    }

    // 設定訂單描述為 URL encoding
    const encodedDesc = encodeURIComponent(orderDesc);

    // 更新隱藏欄位的值
    const hiddenAmount = document.getElementById('hiddenAmount') as HTMLInputElement;
    const hiddenOrderDesc = document.getElementById('hiddenOrderDesc') as HTMLInputElement;
    if (hiddenAmount) hiddenAmount.value = type === 'Query' ? '0' : String(amountInCents);
    if (hiddenOrderDesc) hiddenOrderDesc.value = encodedDesc;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="mb-4 text-xl font-semibold">信用卡支付測試</h2>
      <form
        method="POST"
        action="https://testtrustlink.hitrust.com.tw/TrustLink/TrxReqForJava"
        onSubmit={handleSubmit}
      >
        {/* 交易類型選擇 */}
        <label className="block font-semibold">交易類型 (Type)</label>
        {[
          'Auth',
          'AuthSSL',
          'AuthRe',
          'Capture',
          'CaptureRe',
          'Refund',
          'RefundRe',
          'Query',
          'SIP_QUERY',
        ].map((option) => (
          <label key={option} className="mr-4">
            <input
              type="radio"
              name="Type"
              value={option}
              checked={type === option}
              onChange={(e) => setType(e.target.value)}
            />
            {option}
          </label>
        ))}

        {/* 商家代碼 */}
        <input type="hidden" name="storeid" value="62695" />

        {/* 訂單編號（僅在需要時顯示） */}
        {['AuthRe', 'Capture', 'CaptureRe', 'Refund', 'RefundRe', 'Query'].includes(type) && (
          <>
            <label htmlFor="ordernumber" className="mt-4 block font-semibold">
              訂單編號
            </label>
            <input
              id="ordernumber"
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="mb-2 border p-2"
              name="ordernumber"
            />
          </>
        )}

        {/* 訂單金額（查詢時不顯示） */}
        {type !== 'Query' && (
          <>
            <label htmlFor="amount" className="mt-4 block font-semibold">
              交易金額 (元)
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mb-2 border p-2"
            />
            <input type="hidden" name="amount" id="hiddenAmount" value="" />
          </>
        )}

        {/* 訂單描述 (顯示用) */}
        <label htmlFor="orderdesc" className="mt-4 block font-semibold">
          訂單描述
        </label>
        <input
          id="orderdesc"
          type="text"
          value={orderDesc}
          onChange={(e) => setOrderDesc(e.target.value)}
          className="mb-2 border p-2"
        />
        <input type="hidden" name="orderdesc" id="hiddenOrderDesc" value="" />

        {/* 卡號與有效期限（僅 `AuthSSL` 需要） */}
        {type === 'AuthSSL' && (
          <>
            <label htmlFor="pan" className="mt-4 block font-semibold">
              信用卡卡號
            </label>
            <input
              id="pan"
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="mb-2 border p-2"
              name="pan"
            />

            <label htmlFor="expiry" className="mt-4 block font-semibold">
              有效期限 (YYMM)
            </label>
            <input
              id="expiry"
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="mb-2 border p-2"
              name="expiry"
            />
          </>
        )}

        {/* 請款模式選擇 */}
        <label className="mt-4 block font-semibold">請款模式 (depositflag)</label>
        <label className="mr-4">
          <input
            type="radio"
            name="depositflag"
            value="1"
            checked={depositFlag === '1'}
            onChange={(e) => setDepositFlag(e.target.value)}
          />
          自動請款 (Sale 交易)
        </label>
        <label>
          <input
            type="radio"
            name="depositflag"
            value="0"
            checked={depositFlag === '0'}
            onChange={(e) => setDepositFlag(e.target.value)}
          />
          手動請款 (一般交易)
        </label>

        {/* 啟動查詢選擇 */}
        <label className="mt-4 block font-semibold">啟動查詢 (queryflag)</label>
        <label className="mr-4">
          <input
            type="radio"
            name="queryflag"
            value="1"
            checked={queryFlag === '1'}
            onChange={(e) => setQueryFlag(e.target.value)}
          />
          詳細資料 (交易詳細資訊會送到 merUpdateURL)
        </label>
        <label>
          <input
            type="radio"
            name="queryflag"
            value="0"
            checked={queryFlag === '0'}
            onChange={(e) => setQueryFlag(e.target.value)}
          />
          一般資料
        </label>

        {/* 回傳 URL */}
        <input type="hidden" name="returnURL" value="https://isunfa.tw/test/payment/result" />
        <input
          type="hidden"
          name="merUpdateURL"
          value="https://isunfa.tw/api/test/payment/update"
        />

        <button type="submit" className="mt-4 rounded bg-blue-500 px-6 py-2 text-white">
          前往支付
        </button>
      </form>
    </div>
  );
};

export default HiTrustPaymentForm;
