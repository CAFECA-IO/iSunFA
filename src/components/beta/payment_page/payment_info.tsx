import { IPlan } from '@/interfaces/subscription';
import { useTranslation } from 'next-i18next';
import { IDiscount } from '@/interfaces/discount';

interface PaymentInfoProps {
  plan: IPlan | undefined;
  discount?: IDiscount;
}

const PaymentInfo = ({ plan, discount }: PaymentInfoProps) => {
  const { t } = useTranslation(['subscriptions']);
  if (!plan) {
    return (
      <div>
        <h1>{t('subscriptions:ERROR.PLAN_NOT_FOUND')}</h1>
      </div>
    );
  }

  // Info: (20251002 - Julian) 預設稅額為 0
  const tax = 0;

  // Info: (20251002 - Julian) 預設沒有折扣： 折扣百分比 = 1，折扣金額 = 0
  const discountPercentage = discount?.discountPercentage ?? 1;
  const discountAmount = discount?.discountAmount ?? 0;

  // Info: (20251002 - Julian) 是否取得折扣
  const isDiscount = discount !== undefined && (discountAmount !== 0 || discountPercentage !== 0);

  // Info: (20251002 - Julian) 計算含稅價格 = 原價 + 稅額
  const price = plan.price + tax;

  // Info: (20251002 - Julian) 計算總折扣金額 = 含稅價格 * (1 - 折扣百分比) + 折扣金額，並四捨五入到整數
  const totalDiscount = isDiscount
    ? Math.round(price * (1 - discountPercentage) + discountAmount)
    : 0;

  // Info: (20251002 - Julian) 計算總價格 = 含稅價格 + 稅額 - 總折扣金額
  const totalPrice = price - totalDiscount;

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

      <div
        className={`${isDiscount ? 'grid-rows-1' : 'grid-rows-0'} grid grid-cols-1 overflow-hidden transition-all duration-300 ease-in-out`}
      >
        <p className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-neutral-tertiary tablet:text-lg">
            {t('subscriptions:PAYMENT_PAGE.DISCOUNT')}
          </span>
          <span className="text-xl font-bold leading-8 text-text-state-error">{`$ -${totalDiscount?.toLocaleString('zh-TW')} NTD`}</span>
        </p>
      </div>

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
