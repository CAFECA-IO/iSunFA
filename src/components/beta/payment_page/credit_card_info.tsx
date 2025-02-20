import { Dispatch, SetStateAction, useEffect, useState } from 'react';
// import Image from 'next/image';
import { IPlan, IUserOwnedTeam } from '@/interfaces/subscription';
import SimpleToggle from '@/components/beta/subscriptions_page/simple_toggle';
// import { FiPlusCircle } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
// import { useModalContext } from '@/contexts/modal_context';
// import { ToastType } from '@/interfaces/toastify';
// import { ToastId } from '@/constants/toast_id';
// import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaymentMethod } from '@/interfaces/payment';
// import { useRouter } from 'next/router';

interface CreditCardInfoProps {
  team: IUserOwnedTeam;
  plan: IPlan | undefined;
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
}

const CreditCardInfo = ({
  plan,
  team,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
  // Deprecated: (20250220 - Tzuhan) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setIsDirty,
}: CreditCardInfoProps) => {
  const { t } = useTranslation(['subscriptions']);
  // const { toastHandler } = useModalContext();
  // const router = useRouter();
  // Deprecated: (20250220 - Tzuhan) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [paymentMethod, setPaymentMethod] = useState<IPaymentMethod[] | null>(null);

  // Info: (20250120 - Liz) 如果 paymentMethod 是 undefined ，或者 paymentMethod 的長度是 0，就回傳 null
  // const hasCreditCardInfo = paymentMethod && paymentMethod.length > 0;

  // Info: (20250120 - Liz) 取得信用卡 number
  // const creditCardNumber = hasCreditCardInfo ? paymentMethod[0].number : '';

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

  const isAutoRenewalEnabled = team.enableAutoRenewal;

  const openTurnOnAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(team);
  };

  const openTurnOffAutoRenewalModal = () => {
    setTeamForAutoRenewalOff(team);
  };

  // Info: (20250120 - Liz) 綁定信用卡資料
  // const bindCreditCard = () => window.open('/api/payment'); // Info: (20250115 - Julian) 連接到第三方金流頁面

  /* Info: (20250220 - Tzuhan) 為串接 HiTrust 金流測試: 會替換成跳轉至 HiTrust 金流頁面
  // Info: (20250120 - Liz) 打 API 變更團隊的訂閱方案
  const updateSubscription = async () => {
    if (!team || !plan) return;
    setIsDirty(false); // Info: (20250121 - Liz) 取消阻止離開頁面

    // Info: (20250120 - Julian) POST /api/v2/team/:teamId/checkout
    const url = `/api/v2/team/${team.id}/checkout`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(plan),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }

      // Info: (20250120 - Julian) 導引到訂閱管理首頁 /users/subscriptions
      router.push(ISUNFA_ROUTE.SUBSCRIPTIONS);

      // Info: (20250120 - Julian) 顯示成功訊息
      toastHandler({
        id: ToastId.SUBSCRIPTION_UPDATE_SUCCESS,
        type: ToastType.SUCCESS,
        content: t('subscriptions:PAYMENT_PAGE.TOAST_SUBSCRIPTION_SUCCESS'),
        closeable: true,
      });
    } catch (error) {
      // console.log('Failed to subscribe! error:', error);
    } finally {
      setIsDirty(true);
    }
  };
  */

  return (
    <section className="flex flex-auto flex-col gap-16px rounded-md bg-surface-neutral-surface-lv2 px-32px py-24px shadow-Dropshadow_XS">
      <div className="flex justify-between">
        <span className="text-lg font-semibold text-text-brand-secondary-lv3">
          {t('subscriptions:PAYMENT_PAGE.PAYMENT')}
        </span>
        {/* Info: (20250220 - Tzuhan) 為串接 HiTrust 金流測試先隱藏: HiTrust 不提供綁定信用卡功能
        {hasCreditCardInfo ? (
          <div className="flex items-center gap-8px">
            <Image src="/icons/credit_card.svg" alt="credit card" width={24} height={24} />
            <span className="text-lg font-semibold text-text-neutral-primary">
              {creditCardNumber}
            </span>

            <button type="button" className="pl-8px" onClick={bindCreditCard}>
              <Image src="/icons/blue_edit.svg" alt="blue_edit" width={16} height={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-8px text-lg font-semibold text-link-text-primary"
            onClick={bindCreditCard}
          >
            <span>{t('subscriptions:PAYMENT_PAGE.ADD_CREDIT_CARD')}</span>
            <FiPlusCircle />
          </button>
        )} */}
      </div>

      <div className="h-1px bg-divider-stroke-lv-4"></div>

      <div className="flex flex-auto items-start justify-between gap-20px">
        <span className="text-lg font-semibold text-text-brand-secondary-lv1">
          {t('subscriptions:SUBSCRIPTIONS_PAGE.ENABLE_AUTO_RENEWAL')}
        </span>
        <SimpleToggle
          isOn={isAutoRenewalEnabled}
          onClick={isAutoRenewalEnabled ? openTurnOffAutoRenewalModal : openTurnOnAutoRenewalModal}
        />
      </div>

      <div className="flex flex-col text-xs leading-5">
        <span className="font-semibold text-text-brand-primary-lv1">
          {t('subscriptions:PAYMENT_PAGE.YOU_CAN_CANCEL_YOUR_SUBSCRIPTION_ANYTIME')}
        </span>
        <span className="font-medium text-text-neutral-tertiary">{`* ${t('subscriptions:PAYMENT_PAGE.NOTE')}`}</span>
      </div>

      <form
        className="w-full"
        method="POST"
        action="https://testtrustlink.hitrust.com.tw/TrustLink/TrxReqForJava"
        onSubmit={() => {
          window.onbeforeunload = null; // Info: (20250220 - Tzuhan) 移除「離開網站」的提示
        }}
      >
        <input type="hidden" name="Type" value="Auth" />
        <input type="hidden" name="storeid" value="62695" />
        <input
          type="hidden"
          name="ordernumber"
          value={`${team.id}${plan?.planName || ''}${isAutoRenewalEnabled}`}
        />
        <input type="hidden" name="amount" value={(plan?.price || 0) * 100} />
        <input
          type="hidden"
          name="orderdesc"
          value={`iSunFa-team_${team.id}-plan_${plan?.planName}-autorenew_${isAutoRenewalEnabled}-
          time_${Math.floor(Date.now() / 1000)}`}
        />
        <input type="hidden" name="depositflag" value="1" /> {/* 自動請款 */}
        <input type="hidden" name="queryflag" value="1" /> {/* 回傳交易詳情 */}
        <input
          type="hidden"
          name="returnURL"
          value={`https://isunfa.tw/users/subscriptions/${team.id}`}
        />
        <input type="hidden" name="merUpdateURL" value="https://isunfa.tw/api/v2/payment/update" />
        {/* 如果用戶選擇「自動續訂」，則設定定期扣款 */}
        {isAutoRenewalEnabled && (
          <>
            <input type="hidden" name="e56" value="20" /> {/* 12 期 */}
            <input type="hidden" name="e57" value="1" /> {/* 每 1 期扣款 */}
            <input type="hidden" name="e58" value="Y" /> {/* M = 每月扣款 */}
          </>
        )}
        <button
          type="submit"
          className="w-full rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-semibold text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
          // onClick={updateSubscription}
          disabled={(plan?.price || 0) <= 0}
        >
          {t('subscriptions:PAYMENT_PAGE.SUBSCRIBE')}
        </button>
      </form>
    </section>
  );
};

export default CreditCardInfo;
