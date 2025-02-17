import { useRouter } from 'next/router';

export default function PaymentResult() {
  const router = useRouter();
  const { type, ordernumber, amount, retcode, pan } = router.query;

  if (!ordernumber || !amount || !retcode || !pan) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <h2 className="text-2xl font-bold">❌ 交易結果不完整</h2>
        <p>請確認交易是否成功</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h2 className="text-2xl font-bold">💳 交易完成</h2>
      <p>
        <strong>訂單編號:</strong> {ordernumber}
      </p>
      <p>
        <strong>交易類型:</strong> {type}
      </p>
      <p>
        <strong>交易金額:</strong> {Number(amount) / 100} 元
      </p>
      <p>
        <strong>交易結果:</strong> {retcode === '00' ? '成功 ✅' : '失敗 ❌'}
      </p>
      <p>
        <strong>信用卡卡號:</strong> {pan}
      </p>
      <button
        type="button"
        onClick={() => router.push('/test/payment')}
        className="mt-4 rounded bg-blue-500 px-6 py-2 text-white"
      >
        回測試付款頁面
      </button>
    </div>
  );
}
