import { ITeamInvoice } from '@/interfaces/subscription';
import { timestampToString } from '@/lib/utils/common';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';

interface InvoiceProps {
  invoice: ITeamInvoice;
}

const Invoice = ({ invoice }: InvoiceProps) => {
  const { t } = useTranslation(['subscriptions']);
  const billingDate = timestampToString(invoice.issuedTimestamp).date;
  const router = useRouter();

  const targetUrl = router.asPath.replace('billing', `${invoice.id}`);

  return (
    <section key={invoice.id} className="bg-surface-neutral-surface-lv2">
      <Link href={targetUrl} className="flex h-72px hover:bg-surface-brand-primary-10">
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
            {`$ ${invoice.amountDue.toLocaleString('zh-TW')} `}
            <span className="text-text-neutral-tertiary">{t('common:CURRENCY_ALIAS.TWD')}</span>
          </p>
        </div>

        <div className="flex flex-auto items-center justify-center">
          {invoice.status ? (
            <div className="flex min-w-22px items-center justify-center gap-1px rounded-full bg-badge-surface-soft-success px-15px py-1px">
              <Image src="/icons/paid_check.svg" alt="check" width={14} height={14} />
              <span className="whitespace-nowrap px-2.5px text-xs font-medium leading-5 text-badge-text-success-solid">
                {t('subscriptions:BILLING_PAGE.PAID')}
              </span>
            </div>
          ) : (
            <div className="flex min-w-22px items-center justify-center gap-1px rounded-full bg-surface-state-error-soft px-15px py-1px">
              <Image src="/icons/alert_triangle.svg" alt="alert_triangle" width={14} height={14} />
              <span className="px-2.5px text-xs font-medium leading-5 text-text-state-error-solid">
                {t('subscriptions:BILLING_PAGE.FAILED')}
              </span>
            </div>
          )}
        </div>
      </Link>
    </section>
  );
};

interface InvoiceListProps {
  invoiceList: ITeamInvoice[];
  billingDateSort: null | SortOrder;
  setBillingDateSort: (sortOrder: null | SortOrder) => void;
  invoiceIDSort: null | SortOrder;
  setInvoiceIDSort: (sortOrder: null | SortOrder) => void;
  amountSort: null | SortOrder;
  setAmountSort: (sortOrder: null | SortOrder) => void;
}

const InvoiceList = ({
  invoiceList,
  billingDateSort,
  setBillingDateSort,
  invoiceIDSort,
  setInvoiceIDSort,
  amountSort,
  setAmountSort,
}: InvoiceListProps) => {
  const { t } = useTranslation(['subscriptions', 'common']);

  const displayedList =
    invoiceList.length > 0 ? (
      invoiceList.map((invoice) => <Invoice key={invoice.id} invoice={invoice} />)
    ) : (
      // Info: (20250613 - Julian) 沒有發票時顯示的訊息
      <div className="flex h-72px items-center justify-center bg-surface-neutral-surface-lv2 text-text-neutral-primary">
        <p>{t('common:COMMON.NO_DATA')}</p>
      </div>
    );

  return (
    <main className="flex w-max flex-col gap-12px tablet:w-full">
      <section className="flex divide-x divide-stroke-neutral-quaternary border-b border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1 py-8px">
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">
            <SortingButton
              string={t('subscriptions:BILLING_PAGE.INVOICE_ID')}
              sortOrder={invoiceIDSort}
              setSortOrder={setInvoiceIDSort}
            />
          </p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">
            <SortingButton
              string={t('subscriptions:BILLING_PAGE.BILLING_DATE')}
              sortOrder={billingDateSort}
              setSortOrder={setBillingDateSort}
            />
          </p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">
            {t('subscriptions:BILLING_PAGE.PLAN')}
          </p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">
            <SortingButton
              string={t('subscriptions:BILLING_PAGE.AMOUNT')}
              sortOrder={amountSort}
              setSortOrder={setAmountSort}
            />
          </p>
        </div>
        <div className="flex w-180px items-center justify-center">
          <p className="text-xs font-semibold text-text-neutral-tertiary">
            {t('subscriptions:BILLING_PAGE.STATUS')}
          </p>
        </div>
      </section>

      {displayedList}
    </main>
  );
};

export default InvoiceList;
