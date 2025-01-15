import { Dispatch, SetStateAction, useState } from 'react';
import Image from 'next/image';
import { IPlan, IUserOwnedTeam, ICreditCardInfo } from '@/interfaces/subscription';
import SimpleToggle from '@/components/beta/subscriptions_page/simple_toggle';

interface CreditCardInfoProps {
  team: IUserOwnedTeam;
  plan: IPlan | undefined;
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
}

const FAKE_CREDIT_CARD_INFO: ICreditCardInfo = {
  lastFourDigits: '4002',
};

const CreditCardInfo = ({
  plan,
  team,
  setTeamForAutoRenewalOn,
  setTeamForAutoRenewalOff,
}: CreditCardInfoProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [creditCardInfo, setCreditCardInfo] = useState(FAKE_CREDIT_CARD_INFO);

  const isAutoRenewalEnabled = team.enableAutoRenewal;

  const openTurnOnAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(team);
  };

  const openTurnOffAutoRenewalModal = () => {
    setTeamForAutoRenewalOff(team);
  };

  // ToDo: (20250114 - Liz) 打 API 取得信用卡資料 ICreditCardInfo (使用 teamId)，並且設定到 creditCardInfo state

  // ToDo: (20250114 - Liz) 打 API 編輯信用卡資料
  const editCreditCard = () => {};

  // ToDo: (20250114 - Liz) 打 API 變更團隊的訂閱方案(使用 teamId, planId)，並且重新打 API 取得最新的 userOwnedTeams: IUserOwnedTeam[];
  // Deprecated: (20250114 - Liz)
  // eslint-disable-next-line no-console
  console.log('plan', plan);

  return (
    <section className="flex flex-auto flex-col gap-16px rounded-md bg-surface-neutral-surface-lv2 px-32px py-24px shadow-Dropshadow_XS">
      <div className="flex justify-between">
        <span className="text-lg font-semibold text-text-brand-secondary-lv3">Payment</span>

        {creditCardInfo && (
          <div className="flex items-center gap-8px">
            <Image src="/icons/credit_card.svg" alt="credit card" width={24} height={24} />
            <span className="text-lg font-semibold text-text-neutral-primary">
              **** **** **** {creditCardInfo.lastFourDigits}
            </span>

            <button type="button" className="pl-8px" onClick={editCreditCard}>
              <Image src="/icons/blue_edit.svg" alt="blue_edit" width={16} height={16} />
            </button>
          </div>
        )}
      </div>

      <div className="h-1px bg-divider-stroke-lv-4"></div>

      <div className="flex flex-auto items-start justify-between gap-20px">
        <span className="text-lg font-semibold text-text-brand-secondary-lv1">
          Enable Auto-Renewal
        </span>
        <SimpleToggle
          isOn={isAutoRenewalEnabled}
          onClick={isAutoRenewalEnabled ? openTurnOffAutoRenewalModal : openTurnOnAutoRenewalModal}
        />
      </div>

      <div className="flex flex-col text-xs leading-5">
        <span className="font-semibold text-text-brand-primary-lv1">
          You can cancel your subscription anytime.
        </span>
        <span className="font-medium text-text-neutral-tertiary">
          * Your current plan will remain active until the next renewal date, and no refunds will be
          issued for the current billing period.
        </span>
      </div>

      <button
        type="button"
        onClick={() => window.open('/api/payment')} // Info: (20250115 - Julian) 連接到第三方金流頁面
        className="rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-semibold text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
      >
        Subscribe
      </button>
    </section>
  );
};

export default CreditCardInfo;
