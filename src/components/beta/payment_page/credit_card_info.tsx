import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import { IPlan, IUserOwnedTeam, ICreditCardInfo } from '@/interfaces/subscription';
import SimpleToggle from '@/components/beta/subscriptions_page/simple_toggle';
import { FiPlusCircle } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';

interface CreditCardInfoProps {
  team: IUserOwnedTeam;
  plan: IPlan | undefined;
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  getTeamData: () => Promise<void>;
}

const FAKE_CREDIT_CARD_INFO: ICreditCardInfo = {
  lastFourDigits: '4002',
};

const CreditCardInfo = ({
  plan,
  team,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
  getTeamData,
}: CreditCardInfoProps) => {
  const { t } = useTranslation(['subscriptions']);
  // Deprecated: (20250116 - Liz)
  // eslint-disable-next-line no-console
  console.log('plan:', plan);

  const { toastHandler } = useModalContext();

  // ToDo: (20250116 - Liz) 這邊的 creditCardInfo state 是用來存信用卡資料(末四碼)，目前是用假資料，之後要串接 API 取得真實資料
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [creditCardInfo, setCreditCardInfo] = useState<ICreditCardInfo | null>(
    FAKE_CREDIT_CARD_INFO
  );

  const isAutoRenewalEnabled = team.enableAutoRenewal;

  const openTurnOnAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(team);
  };

  const openTurnOffAutoRenewalModal = () => {
    setTeamForAutoRenewalOff(team);
  };

  // ToDo: (20250114 - Liz) 打 API 取得信用卡末四碼資料 ICreditCardInfo (使用 teamId)，並且設定到 creditCardInfo state

  // ToDo: (20250114 - Liz) 打 API 綁定信用卡資料
  const bindCreditCard = () => window.open('/api/payment'); // Info: (20250115 - Julian) 連接到第三方金流頁面
  // ToDo: (20250116 - Liz) 打 window.open('/api/payment') 會回傳使用者綁定信用卡的資訊嗎？像是綁定成功或失敗、信用卡末四碼？還是這個 API 會直接處理變更團隊的訂閱方案，並且回傳變更成功或失敗的訊息？

  // ToDo: (20250114 - Liz) 打 API 變更團隊的訂閱方案(使用 teamId, planId)，並且重新打 API 取得最新的 userOwnedTeams: IUserOwnedTeam[];
  const subscribe = async () => {
    // ToDo: (20250116 - Liz) 打 API 變更團隊的訂閱方案成功的話就顯示成功訊息，失敗的話就顯示失敗訊息

    const success = true;

    if (success) {
      toastHandler({
        id: ToastId.SUBSCRIPTION_UPDATE_SUCCESS,
        type: ToastType.SUCCESS,
        content: t('subscriptions:PAYMENT_PAGE.TOAST_SUBSCRIPTION_SUCCESS'),
        closeable: true,
      });
    }

    getTeamData(); // Info: (20250116 - Liz) 重新打 API 取得最新的 userOwnedTeams: IUserOwnedTeam[];
  };

  return (
    <section className="flex flex-auto flex-col gap-16px rounded-md bg-surface-neutral-surface-lv2 px-32px py-24px shadow-Dropshadow_XS">
      <div className="flex justify-between">
        <span className="text-lg font-semibold text-text-brand-secondary-lv3">
          {t('subscriptions:PAYMENT_PAGE.PAYMENT')}
        </span>

        {creditCardInfo ? (
          <div className="flex items-center gap-8px">
            <Image src="/icons/credit_card.svg" alt="credit card" width={24} height={24} />
            <span className="text-lg font-semibold text-text-neutral-primary">
              **** **** **** {creditCardInfo.lastFourDigits}
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

      <button
        type="button"
        className="rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-semibold text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
        onClick={subscribe}
      >
        {t('subscriptions:PAYMENT_PAGE.SUBSCRIBE')}
      </button>
    </section>
  );
};

export default CreditCardInfo;
