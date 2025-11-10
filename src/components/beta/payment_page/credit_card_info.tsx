import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { PiSpinner } from 'react-icons/pi';
import { IPlan, IUserOwnedTeam } from '@/interfaces/subscription';
import SimpleToggle from '@/components/beta/subscriptions_page/simple_toggle';
import { FiPlusCircle } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { IPaymentMethod } from '@/interfaces/payment';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { Button } from '@/components/button/button';
import { ISUNFA_ROUTE } from '@/constants/url';
import loggerFront from '@/lib/utils/logger_front';

interface CreditCardInfoProps {
  team: IUserOwnedTeam;
  plan: IPlan | undefined;
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  // setIsDirty: Dispatch<SetStateAction<boolean>>;
  isHideSubscribeButton?: boolean;
}

const CreditCardInfo = ({
  plan,
  team,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
  // setIsDirty,
  isHideSubscribeButton,
}: CreditCardInfoProps) => {
  const { t } = useTranslation(['subscriptions']);
  const { bindingResult, userAuth, paymentMethod, handlePaymentMethod } = useUserCtx();
  const { toastHandler } = useModalContext();
  const router = useRouter();

  // Info: (20250604 - Julian) 預設的信用卡資訊，取 paymentMethod 的最後一筆資料
  const defaultCardInfo = paymentMethod ? paymentMethod[paymentMethod.length - 1] : null;

  const [isSubscribeBtnDisabled, setIsSubscribeBtnDisabled] = useState(false);
  const [cardInfo, setCardInfo] = useState<IPaymentMethod | null>(defaultCardInfo);
  const [hasCreditCardInfo, setHasCreditCardInfo] = useState<boolean>(false);

  // Info: (20250120 - Liz) 取得信用卡資訊 API
  const { trigger: getCreditCardInfoAPI } = APIHandler<IPaymentMethod[]>(
    APIName.USER_PAYMENT_METHOD_LIST
  );

  // Info: (20250418 - Julian) 更新訂閱方案 API
  const { trigger: updateSubscriptionAPI } = APIHandler(APIName.USER_PAYMENT_METHOD_CHARGE);

  // Info: (20250418 - Julian) 發送 email API
  const { trigger: sendEmail } = APIHandler<void>(APIName.EMAIL);

  // ToDo: (20250418 - Julian) During the development
  const sendEmailHandler = async () => {
    const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    // Info: (20250418 - Julian) dummy data
    const invoiceId = '1234567890';

    sendEmail({
      header: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: {
        title: 'iSunFA Invoice',
        content: `<div><h3>發票編號: ${invoiceId}，請參考附件</h3><p>${now}<p></div>`,
        attachments: [
          {
            filename: `${t('subscriptions:INVOICE_PAGE.INVOICE_TITLE')} ${invoiceId}.pdf`,
            // path: '/files/invoice_19.pdf',
          },
        ],
      },
    });

    loggerFront.log('sendEmailHandler');
  };

  // Info: (20250120 - Liz) 打 API 取得信用卡資料 (使用 teamId)，並且設定到 paymentMethod state
  const getCreditCardInfo = async () => {
    if (!userAuth) return;

    try {
      const { success, data } = await getCreditCardInfoAPI({
        params: { userId: userAuth.id },
      });

      if (success) {
        // Info: (20250324 - Julian) 設定信用卡資料到 paymentMethod state
        const cardData = data ?? [];
        handlePaymentMethod(data);

        // Info: (20250604 - Julian) 如果 paymentMethod 是 undefined ，或者 paymentMethod 的長度是 0，就回傳 null
        setHasCreditCardInfo(cardData.length > 0);

        // Info: (20250604 - Julian) 取得信用卡 number
        setCardInfo(cardData[cardData.length - 1]);
      } else {
        toastHandler({
          id: 'GET_CREDIT_CARD_INFO_FAILED',
          type: ToastType.ERROR,
          content: t('subscriptions:PAYMENT_PAGE.TOAST_GET_CREDIT_CARD_INFO_FAILED'),
          closeable: true,
        });

        // Info: (20250418 - Julian) 發送 email
        sendEmailHandler();
      }
    } catch (error) {
      (error as Error).message += ' (from getCreditCardInfo)';
      // Info: (20250324 - Julian) 顯示錯誤訊息
      toastHandler({
        id: 'GET_CREDIT_CARD_INFO_FAILED',
        type: ToastType.ERROR,
        content: t('subscriptions:PAYMENT_PAGE.TOAST_GET_CREDIT_CARD_INFO_FAILED'),
        closeable: true,
      });
    }
  };

  useEffect(() => {
    getCreditCardInfo();
    window.getCreditCardInfo = getCreditCardInfo; // Info: (20250120 - Liz) 後端需求，將 getCreditCardInfo 掛載到全域的 window 物件上
  }, [bindingResult]);

  const isAutoRenewalEnabled = team.enableAutoRenewal;

  const openTurnOnAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(team);
  };

  const openTurnOffAutoRenewalModal = () => {
    setTeamForAutoRenewalOff(team);
  };

  // Info: (20250120 - Liz) 綁定信用卡資料
  const bindCreditCard = () => window.open('/api/payment'); // Info: (20250115 - Julian) 連接到第三方金流頁面

  // Info: (20250324 - Julian) 更新訂閱方案
  const updateSubscription = async () => {
    if (!(userAuth && paymentMethod)) return;

    // Info: (20250414 - Julian) 執行中，禁用訂閱按鈕
    setIsSubscribeBtnDisabled(true);
    // Info: (20250414 - Julian) 取消阻止離開頁面
    // setIsDirty(false);

    try {
      const { success } = await updateSubscriptionAPI({
        params: {
          userId: userAuth.id,
          paymentMethodId: paymentMethod[paymentMethod.length - 1].id,
        },
        body: {
          teamPlanType: plan?.id,
          teamId: team.id,
        },
      });

      if (success) {
        toastHandler({
          id: 'UPDATE_SUBSCRIPTION_SUCCESS',
          type: ToastType.SUCCESS,
          content: t('subscriptions:PAYMENT_PAGE.TOAST_SUBSCRIPTION_SUCCESS'),
          closeable: true,
        });

        // Info: (20250414 - Julian) 導引到訂閱管理首頁
        router.push(ISUNFA_ROUTE.SUBSCRIPTIONS);
      } else {
        toastHandler({
          id: 'UPDATE_SUBSCRIPTION_FAILED',
          type: ToastType.ERROR,
          content: t('subscriptions:PAYMENT_PAGE.TOAST_SUBSCRIPTION_UPDATE_ERROR'),
          closeable: true,
        });
      }
    } catch (error) {
      (error as Error).message += ' (from updateSubscription)';
      toastHandler({
        id: 'UPDATE_SUBSCRIPTION_FAILED',
        type: ToastType.ERROR,
        content: t('subscriptions:PAYMENT_PAGE.TOAST_SUBSCRIPTION_UPDATE_ERROR'),
        closeable: true,
      });
    }

    // Info: (20250414 - Julian) 完成後，啟用訂閱按鈕
    setIsSubscribeBtnDisabled(false);
  };

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

  const subscribeBtn = isSubscribeBtnDisabled ? (
    <Button type="button" variant="default" size="large" disabled className="hover:cursor-progress">
      {t('subscriptions:PAYMENT_PAGE.PROCESSING')}{' '}
      <div className="animate-spin">
        <PiSpinner />
      </div>
    </Button>
  ) : (
    <Button
      type="button"
      variant="default"
      size="large"
      onClick={updateSubscription}
      disabled={!hasCreditCardInfo}
    >
      {t('subscriptions:PAYMENT_PAGE.SUBSCRIBE')}
    </Button>
  );

  return (
    <section className="flex flex-auto flex-col gap-lv-4 rounded-md bg-surface-neutral-surface-lv2 px-lv-6 py-lv-5 shadow-Dropshadow_XS">
      <div className="flex flex-wrap items-center justify-between">
        <span className="text-base font-semibold text-text-brand-secondary-lv3 tablet:text-lg">
          {t('subscriptions:PAYMENT_PAGE.PAYMENT')}
        </span>
        {hasCreditCardInfo && cardInfo && plan ? (
          <div className="flex items-center gap-8px">
            <Image src="/icons/credit_card.svg" alt="credit card" width={24} height={24} />
            <span className="text-lg font-semibold text-text-neutral-primary">
              {cardInfo.number}
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
        )}
      </div>

      <div className="h-1px bg-divider-stroke-lv-4"></div>

      <div className="flex flex-auto items-start justify-between gap-20px">
        <span className="text-base font-semibold text-text-brand-secondary-lv1 tablet:text-lg">
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

      {/* Info: (20250326 - Julian) 在 CreateTeamModal 不需要顯示按鈕 */}
      {!isHideSubscribeButton && subscribeBtn}
    </section>
  );
};

export default CreditCardInfo;
