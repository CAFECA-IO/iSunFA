import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const PaymentResult = () => {
  const router = useRouter();
  const { ordernumber, retcode } = router.query;
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (retcode === '00') {
      setMessage(`✅ 訂單 ${ordernumber} 付款成功！`);
    } else {
      setMessage(`❌ 訂單 ${ordernumber} 付款失敗，請重新付款。`);
    }
  }, [ordernumber, retcode]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="text-xl font-semibold">{message}</h2>
      <button
        type="button"
        onClick={() => router.push('/')}
        className="mt-4 rounded bg-blue-500 px-6 py-2 text-white"
      >
        回首頁
      </button>
    </div>
  );
};

export default PaymentResult;
