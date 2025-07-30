import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { IUserOwnedTeam } from '@/interfaces/subscription';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaymentMethod } from '@/interfaces/payment';

interface CreditCardInfoProps {
  team: IUserOwnedTeam;
}

const CreditCardInfo = ({ team }: CreditCardInfoProps) => {
  const { t } = useTranslation(['subscriptions']);
  const [paymentMethod, setPaymentMethod] = useState<IPaymentMethod[] | null>(null);

  // Info: (20250120 - Liz) 如果 paymentMethod 是 undefined ，或者 paymentMethod 的長度是 0，就回傳 null
  const hasCreditCardInfo = paymentMethod && paymentMethod.length > 0;

  // Info: (20250120 - Liz) 取得信用卡 number 和 type
  const creditCardNumber = hasCreditCardInfo ? paymentMethod[0].number : '';
  const creditCardType = hasCreditCardInfo ? paymentMethod[0].type : '';

  // Info: (20250120 - Liz) 取得信用卡資訊 API
  const { trigger: getCreditCardInfoAPI } = APIHandler<IPaymentMethod[]>(
    APIName.GET_CREDIT_CARD_INFO
  );

  // Info: (20250120 - Liz) 打 API 取得信用卡資料 (使用 teamId)，並且設定到 paymentMethod state
  useEffect(() => {
    const getCreditCardInfo = async () => {
      const { success, data } = await getCreditCardInfoAPI({
        params: { teamId: team.id },
      });

      if (success) {
        setPaymentMethod(data);
      }
    };

    getCreditCardInfo();
    window.getCreditCardInfo = getCreditCardInfo; // Info: (20250120 - Liz) 後端需求，將 getCreditCardInfo 掛載到全域的 window 物件上
  }, []);

  // Info: (20250115 - Liz) 編輯信用卡資訊
  const editCreditCard = () => window.open('/api/payment'); // Info: (20250116 - Julian) 連接到第三方金流頁面

  // Info: (20250115 - Liz) 如果信用卡資訊不存在，不顯示信用卡資訊
  if (!paymentMethod) {
    return null;
  }

  return (
    <main className="flex flex-col overflow-hidden rounded-lg border border-stroke-brand-primary bg-surface-neutral-surface-lv2 tablet:flex-row">
      <div className="hidden w-24px bg-surface-brand-primary tablet:block"></div>
      <div className="block h-24px flex-none bg-surface-brand-primary tablet:hidden"></div>

      <section className="flex flex-auto flex-col items-center gap-24px bg-surface-brand-primary-5 p-24px tablet:flex-row">
        <div className="flex items-center gap-lv-5">
          {/* // ToDo: (20250120 - Liz) 根據 creditCardType 顯示該類型的卡片發行商 logo */}
          <Image src="/images/master_card.svg" alt="master_card" width={71} height={47} />
          <div className="text-lg font-medium">
            <p className="text-text-neutral-primary">{creditCardType}</p>
            <p className="text-text-neutral-tertiary">{creditCardNumber}</p>
          </div>
        </div>

        <button
          type="button"
          className="w-full rounded-xs border border-button-stroke-primary px-24px py-10px text-base font-medium text-button-text-primary hover:border-button-stroke-secondary-hover hover:text-button-text-secondary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable tablet:ml-auto tablet:w-fit"
          onClick={editCreditCard}
        >
          {t('subscriptions:SUBSCRIPTIONS_PAGE.CHANGE_CARD')}
        </button>
      </section>
    </main>
  );
};

export default CreditCardInfo;
