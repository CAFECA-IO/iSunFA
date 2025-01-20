import { ITeamInvoice } from '@/interfaces/subscription';
import { formatTimestampWithHyphen } from '@/constants/time';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';

interface InvoiceListProps {
  invoiceList: ITeamInvoice[];
}

const InvoiceList = ({ invoiceList }: InvoiceListProps) => {
  const { t } = useTranslation(['subscriptions']);

  return (
    <section className="flex flex-col gap-12px">
      <section className="flex divide-x divide-stroke-neutral-quaternary border-b border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1 py-8px">
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Invoice ID</p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Billing Date</p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Plan</p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Amount</p>
        </div>
        <div className="flex flex-auto items-center justify-center">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Status</p>
        </div>
      </section>

      {invoiceList.map((invoice) => {
        const billingDate = formatTimestampWithHyphen(invoice.issuedTimestamp);
        return (
          <section key={invoice.id} className="flex h-72px bg-surface-neutral-surface-lv2">
            <div className="flex w-180px items-center justify-center px-16px">
              <p className="text-xs font-semibold text-text-neutral-tertiary">{`#${invoice.id}`}</p>
            </div>

            <div className="flex w-180px items-center justify-center px-16px">
              <p className="text-xs font-medium text-text-neutral-primary">{billingDate}</p>
            </div>

            <div className="flex w-180px items-center justify-center px-8px">
              <p className="text-xs font-medium text-text-neutral-primary">
                {t(`subscriptions:PLAN_NAME.${invoice.planId.toUpperCase()}`)}
              </p>
            </div>

            <div className="flex w-180px items-center justify-center px-8px">
              <p className="text-xs font-semibold text-text-neutral-primary">
                {`$ ${invoice.amountDue} `}
                <span className="text-text-neutral-tertiary">{t('common:CURRENCY_ALIAS.TWD')}</span>
              </p>
            </div>

            <div className="flex flex-auto items-center justify-center">
              {invoice.status ? (
                <div className="flex min-w-22px items-center justify-center gap-1px rounded-full bg-badge-surface-soft-success px-15px py-1px">
                  <Image src="/icons/paid_check.svg" alt="check" width={14} height={14} />
                  <span className="px-2.5px text-xs font-medium leading-5 text-badge-text-success-solid">
                    Paid
                  </span>
                </div>
              ) : (
                <div className="flex min-w-22px items-center justify-center gap-1px rounded-full bg-surface-state-error-soft px-15px py-1px">
                  <Image
                    src="/icons/alert_triangle.svg"
                    alt="alert_triangle"
                    width={14}
                    height={14}
                  />
                  <span className="px-2.5px text-xs font-medium leading-5 text-text-state-error-solid">
                    Failed
                  </span>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </section>
  );
};

export default InvoiceList;
