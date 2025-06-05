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
    <section className="flex flex-col gap-lv-4 rounded-md bg-surface-neutral-surface-lv2 px-lv-6 py-lv-5 shadow-Dropshadow_XS">
      <p className="flex flex-wrap items-center justify-between gap-8px">
        <span className="text-sm font-semibold text-text-neutral-tertiary tablet:text-lg">
          {`iSunFA ${t(`subscriptions:PLAN_NAME.${plan.id.toUpperCase()}`)} ${t('subscriptions:PAYMENT_PAGE.MONTHLY_SUBSCRIPTION')}`}
        </span>
        <span className="ml-auto text-xl font-bold leading-8 text-text-neutral-secondary">{`$ ${plan.price.toLocaleString('zh-TW')} NTD`}</span>
      </p>

      <div className="h-1px bg-divider-stroke-lv-4"></div>

      <p className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-neutral-tertiary tablet:text-lg">
          {t('subscriptions:PAYMENT_PAGE.SUBTOTAL')}
        </span>
        <span className="text-xl font-bold leading-8 text-text-neutral-secondary">{`$ ${plan.price.toLocaleString('zh-TW')} NTD`}</span>
      </p>

      <p className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-neutral-tertiary tablet:text-lg">
          {t('subscriptions:PAYMENT_PAGE.TAX')}
        </span>
        <span className="text-xl font-bold leading-8 text-text-neutral-tertiary">{`$ ${tax.toLocaleString('zh-TW')} NTD`}</span>
      </p>

      <div className="h-1px bg-divider-stroke-lv-4"></div>

      <p className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-neutral-tertiary tablet:text-lg">
          {t('subscriptions:PAYMENT_PAGE.TOTAL_PRICE')}
        </span>
        <span className="text-xl font-bold leading-8 text-text-neutral-primary">{`$ ${totalPrice.toLocaleString('zh-TW')} NTD`}</span>
      </p>
    </section>
  );
};

export default PaymentInfo;
