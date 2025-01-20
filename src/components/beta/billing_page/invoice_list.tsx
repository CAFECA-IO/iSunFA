import { ITeamInvoice } from '@/interfaces/subscription';
import { formatTimestampWithHyphen } from '@/constants/time';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';

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
  const { t } = useTranslation(['subscriptions']);

  // Info: (20241003 - Anna) 日期排序按鈕
  const displayedDate = (
    <SortingButton
      string="Billing Date"
      sortOrder={billingDateSort}
      setSortOrder={setBillingDateSort} // Info: (20250120 - Anna) 傳遞父層的回調函數
    />
  );
  // Info: (20241003 - Anna) 方案排序按鈕
  const displayedInvoiceID = (
    <SortingButton
      string="Invoice ID"
      sortOrder={invoiceIDSort}
      setSortOrder={setInvoiceIDSort} // Info: (20250120 - Anna) 傳遞父層的回調函數
    />
  );
  // Info: (20241003 - Anna) 金額排序按鈕
  const displayedAmount = (
    <SortingButton
      string="Amount"
      sortOrder={amountSort}
      setSortOrder={setAmountSort} // Info: (20250120 - Anna) 傳遞父層的回調函數
    />
  );

  return (
    <section className="flex flex-col gap-12px">
      <section className="flex divide-x divide-stroke-neutral-quaternary border-b border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1 py-8px">
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">
            {displayedInvoiceID}
          </p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">
            {displayedDate}
          </p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Plan</p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">
            {displayedAmount}
          </p>
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
                <span className="text-text-neutral-tertiary">TWD</span>
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
