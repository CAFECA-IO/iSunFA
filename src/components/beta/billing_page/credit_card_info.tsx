import { useState } from 'react';
import Image from 'next/image';
import { ICreditCardInfo } from '@/interfaces/subscription';

const FAKE_CREDIT_CARD_INFO: ICreditCardInfo = {
  lastFourDigits: '4002',
};

const CreditCardInfo = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [creditCardInfo, setCreditCardInfo] = useState<ICreditCardInfo | null>(
    FAKE_CREDIT_CARD_INFO
  );

  // ToDo: (20250115 - Liz) 呼叫 API 取得信用卡資訊
  // setCreditCardInfo(creditCardInfoData);

  // Info: (20250115 - Liz) 如果信用卡資訊不存在，不顯示信用卡資訊
  if (!creditCardInfo) {
    return null;
  }

  // ToDo: (20250115 - Liz) 編輯信用卡資訊
  const editCreditCard = () => window.open('/api/payment'); // Info: (20250116 - Julian) 連接到第三方金流頁面

  return (
    <main className="flex overflow-hidden rounded-lg border border-stroke-brand-primary bg-surface-neutral-surface-lv2">
      <div className="w-24px bg-surface-brand-primary"></div>

      <section className="flex flex-auto items-center gap-24px bg-surface-brand-primary-5 p-24px">
        <Image src="/images/master_card.svg" alt="master_card" width={71} height={47} />
        <div className="text-lg font-medium">
          <p className="text-text-neutral-primary">Master Card</p>
          <p className="text-text-neutral-tertiary">
            {`**** **** **** ${creditCardInfo.lastFourDigits}`}
          </p>
        </div>

        <button
          type="button"
          className="ml-auto rounded-xs border border-button-stroke-primary px-24px py-10px text-base font-medium text-button-text-primary hover:border-button-stroke-secondary-hover hover:text-button-text-secondary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable"
          onClick={editCreditCard}
        >
          Change
        </button>
      </section>
    </main>
  );
};

export default CreditCardInfo;
