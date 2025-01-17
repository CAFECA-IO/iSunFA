import { IPlan } from '@/interfaces/subscription';
import { useTranslation } from 'next-i18next';

interface PaymentInfoProps {
  plan: IPlan | undefined;
}

const PaymentInfo = ({ plan }: PaymentInfoProps) => {
  const { t } = useTranslation(['subscriptions']);
  if (!plan) {
    return (
      <div>
        <h1>{t('subscriptions:ERROR.PLAN_NOT_FOUND')}</h1>
      </div>
    );
  }

  const tax = 0;
  const totalPrice = plan.price + tax;
  return (
    <section className="flex flex-col gap-16px rounded-md bg-surface-neutral-surface-lv2 px-32px py-24px shadow-Dropshadow_XS">
      <p className="flex justify-between">
        <span className="text-lg font-semibold text-text-neutral-tertiary">
          {`iSunFA ${t(`subscriptions:SUBSCRIPTIONS_PAGE.${plan.planName.toUpperCase()}`)} ${t('subscriptions:PAYMENT_PAGE.MONTHLY_SUBSCRIPTION')}`}
        </span>
        <span className="text-xl font-bold leading-8 text-text-neutral-secondary">{`$ ${plan.price} NTD`}</span>
      </p>

      <div className="h-1px bg-divider-stroke-lv-4"></div>

      <p className="flex justify-between">
        <span className="text-lg font-semibold text-text-neutral-tertiary">
          {t('subscriptions:PAYMENT_PAGE.SUBTOTAL')}
        </span>
        <span className="text-xl font-bold leading-8 text-text-neutral-secondary">{`$ ${plan.price} NTD`}</span>
      </p>

      <p className="flex justify-between">
        <span className="text-lg font-semibold text-text-neutral-tertiary">
          {t('subscriptions:PAYMENT_PAGE.TAX')}
        </span>
        <span className="text-xl font-bold leading-8 text-text-neutral-tertiary">{`$ ${tax} NTD`}</span>
      </p>

      <div className="h-1px bg-divider-stroke-lv-4"></div>

      <p className="flex justify-between">
        <span className="text-lg font-semibold text-text-neutral-tertiary">
          {t('subscriptions:PAYMENT_PAGE.TOTAL_PRICE')}
        </span>
        <span className="text-xl font-bold leading-8 text-text-neutral-primary">{`$ ${totalPrice} NTD`}</span>
      </p>
    </section>
  );
};

export default PaymentInfo;
