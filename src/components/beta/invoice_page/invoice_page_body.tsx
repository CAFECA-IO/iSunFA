import React, { useRef } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { LuDownload } from 'react-icons/lu';
import { BiPrinter } from 'react-icons/bi';
import { Button } from '@/components/button/button';
import { ITeamInvoice } from '@/interfaces/subscription';
import { numberWithCommas, timestampToString } from '@/lib/utils/common';
import { useReactToPrint } from 'react-to-print';

interface InvoicePageBodyProps {
  invoice: ITeamInvoice;
}

const InvoicePageBody: React.FC<InvoicePageBodyProps> = ({ invoice }) => {
  const { t } = useTranslation(['subscriptions', 'common']);
  const printRef = useRef<HTMLDivElement>(null);

  const {
    id: invoiceId,
    planId,
    issuedTimestamp,
    dueTimestamp,
    payer,
    payee,
    planQuantity,
    planUnitPrice,
    planAmount,
    subtotal,
    tax,
    total,
    amountDue,
  } = invoice;

  const taxAmount = (subtotal * tax) / 100;

  const unit = t('common:CURRENCY_ALIAS.TWD');
  const planName = t(`subscriptions:SUBSCRIPTIONS_PAGE.${planId.toUpperCase()}`);

  const footnote = `#${invoiceId} - $ ${numberWithCommas(amountDue)} ${unit} ${t('subscriptions:INVOICE_PAGE.FOOTNOTE_DUE')} ${timestampToString(dueTimestamp / 1000).date}`;

  // ToDo: (20250115 - Julian) 下載發票
  const downloadClickHandler = () => {
    // Deprecated: (20250116 - Julian) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log('Download invoice ', invoiceId);
  };

  // Info: (20250115 - Julian) 列印發票
  const handlePrint = useReactToPrint({
    contentRef: printRef, // Info: (20250117 - Julian) 指定需要打印的內容 Ref
    documentTitle: `${t('subscriptions:INVOICE_PAGE.INVOICE_TITLE')} ${invoiceId}`,
    onBeforePrint: async () => {
      return Promise.resolve(); // Info: (20250117 - Julian) 確保回傳一個 Promise
    },
    onAfterPrint: async () => {
      return Promise.resolve(); // Info: (20250117 - Julian) 確保回傳一個 Promise
    },
  });

  const printClickHandler = () => handlePrint();

  const issueAndDueCard = (
    <div className="flex h-150px flex-col gap-16px rounded-md bg-surface-brand-primary-10 px-40px py-12px font-semibold print:h-auto">
      {/* Info: (20250115 - Julian) Issued Date */}
      <div className="flex flex-col items-start gap-6px">
        <p className="text-text-brand-primary-lv1">{t('subscriptions:INVOICE_PAGE.ISSUED')}</p>
        <p className="text-xs text-text-neutral-secondary">
          {timestampToString(issuedTimestamp / 1000).date}
        </p>
      </div>
      {/* Info: (20250115 - Julian) Due Date */}
      <div className="flex flex-col items-start gap-6px">
        <p className="text-text-brand-primary-lv1">{t('subscriptions:INVOICE_PAGE.DUE')}</p>
        <p className="text-xs text-text-neutral-secondary">
          {timestampToString(dueTimestamp / 1000).date}
        </p>
      </div>
    </div>
  );

  const billedToCard = (
    <div className="flex h-150px flex-col gap-6px rounded-md bg-surface-brand-primary-10 px-40px py-12px print:h-auto">
      <p className="font-semibold text-text-brand-primary-lv1">
        {t('subscriptions:INVOICE_PAGE.BILLED_TO')}
      </p>
      <div className="flex flex-col items-start gap-4px">
        <p className="text-xs font-semibold text-text-neutral-secondary">{payee.name}</p>
        <p className="text-xs text-text-neutral-secondary">{payee.address}</p>
        <p className="text-xs text-text-neutral-secondary">{payee.phone}</p>
        {/* Info: (20250115 - Julian) Tax ID */}
        <div className="text-xs text-text-neutral-secondary">
          <span className="font-semibold uppercase">{t('subscriptions:INVOICE_PAGE.TAX_ID')} </span>
          {payee.taxId}
        </div>
      </div>
    </div>
  );

  const fromCard = (
    <div className="flex h-150px flex-col gap-6px rounded-md bg-surface-brand-primary-10 px-40px py-12px print:h-auto">
      <p className="font-semibold text-text-brand-primary-lv1">
        {t('subscriptions:INVOICE_PAGE.FROM')}
      </p>
      <div className="flex flex-col items-start gap-4px">
        <p className="text-xs font-semibold text-text-neutral-secondary">{payer.name}</p>
        <p className="text-xs text-text-neutral-secondary">{payer.address}</p>
        <p className="text-xs text-text-neutral-secondary">{payer.phone}</p>
        {/* Info: (20250115 - Julian) Tax ID */}
        <div className="text-xs text-text-neutral-secondary">
          <span className="font-semibold uppercase">{t('subscriptions:INVOICE_PAGE.TAX_ID')} </span>
          {payer.taxId}
        </div>
      </div>
    </div>
  );

  const planList = (
    <div className="flex w-full flex-col divide-y divide-stroke-neutral-quaternary">
      {/* Info: (20250115 - Julian) title */}
      <div className="flex items-center gap-50px py-12px text-sm font-semibold text-text-neutral-tertiary">
        <p className="flex-1">{t('subscriptions:INVOICE_PAGE.DESCRIPTION')}</p>
        <p className="w-80px text-center">{t('subscriptions:INVOICE_PAGE.QTY')}</p>
        <p className="w-80px text-center">{t('subscriptions:INVOICE_PAGE.UNIT_PRICE')}</p>
        <p className="w-80px text-right">{t('subscriptions:INVOICE_PAGE.AMOUNT')}</p>
      </div>
      {/* Info: (20250115 - Julian) content */}
      <div className="flex items-center gap-50px py-12px text-sm text-text-neutral-primary">
        <div className="flex flex-1 flex-col items-start">
          <p className="font-semibold">{planName}</p>
          <p>
            {timestampToString(issuedTimestamp / 1000).date} {t('common:COMMON.TO')}{' '}
            {timestampToString(dueTimestamp / 1000).date}
          </p>
        </div>
        <p className="w-80px text-center">{planQuantity}</p>
        <p className="w-80px whitespace-nowrap text-center">
          $ {numberWithCommas(planUnitPrice)} {unit}
        </p>
        <p className="w-80px whitespace-nowrap text-right">
          $ {numberWithCommas(planAmount)} {unit}
        </p>
      </div>
    </div>
  );

  const conclusion = (
    <div className="ml-auto flex w-200px flex-col items-end">
      {/* Info: (20250115 - Julian) Subtotal */}
      <div className="flex w-full items-center justify-between border-y border-stroke-neutral-quaternary py-10px">
        <p className="font-semibold text-text-neutral-primary">
          {t('subscriptions:INVOICE_PAGE.SUBTOTAL')}
        </p>
        <p className="text-right font-medium text-text-neutral-tertiary">
          $ {numberWithCommas(subtotal)} {unit}
        </p>
      </div>
      {/* Info: (20250115 - Julian) Tax */}
      <div className="flex w-full items-center justify-between py-10px">
        <p className="font-semibold text-text-neutral-primary">
          {t('subscriptions:INVOICE_PAGE.TAX')} ({tax}%)
        </p>
        <p className="text-right font-medium text-text-neutral-tertiary">
          $ {numberWithCommas(taxAmount)} {unit}
        </p>
      </div>
      {/* Info: (20250115 - Julian) Total */}
      <div className="flex w-full items-center justify-between border-t border-stroke-neutral-quaternary py-10px">
        <p className="font-semibold text-text-neutral-primary">
          {t('subscriptions:INVOICE_PAGE.TOTAL')}
        </p>
        <p className="text-right font-medium text-text-neutral-primary">
          $ {numberWithCommas(total)} {unit}
        </p>
      </div>
      {/* Info: (20250116 - Julian) Amount due */}
      <div className="flex w-full items-center justify-between border-y-2 border-stroke-brand-primary py-10px">
        <p className="font-semibold text-text-brand-primary-lv1">
          {t('subscriptions:INVOICE_PAGE.AMOUNT_DUE')}
        </p>
        <p className="text-right font-medium text-text-brand-primary-lv1">
          $ {numberWithCommas(amountDue)} {unit}
        </p>
      </div>
    </div>
  );

  return (
    <main className="flex w-full flex-col gap-40px p-40px">
      {/* Info: (20250115 - Julian) Buttons */}
      <div className="ml-auto flex items-center gap-16px">
        <Button
          type="button"
          variant="secondaryOutline"
          size="defaultSquare"
          onClick={downloadClickHandler}
        >
          <LuDownload size={16} />
        </Button>
        <Button
          type="button"
          variant="secondaryOutline"
          size="defaultSquare"
          onClick={printClickHandler}
        >
          <BiPrinter size={16} />
        </Button>
      </div>

      {/* Info: (20250115 - Julian) Invoice Detail */}
      <div
        ref={printRef}
        className="flex flex-col gap-24px bg-surface-neutral-surface-lv2 px-40px py-24px print:h-a4-height print:w-a4-width"
      >
        {/* Info: (20250115 - Julian) Invoice Title */}
        <div className="flex items-center justify-between">
          {/* Info: (20250115 - Julian) Invoice Id */}
          <div className="flex flex-col items-start">
            <h1 className="text-3xl font-bold text-text-neutral-primary">
              {t('subscriptions:INVOICE_PAGE.INVOICE_TITLE')}
            </h1>
            <p className="font-semibold text-text-neutral-tertiary"># {invoiceId}</p>
          </div>
          <Image src="/logo/isunfa_logo_new_icon.svg" alt="isunfa_logo" width={48} height={48} />
        </div>

        {/* Info: (20250115 - Julian) Divider */}
        <hr className="border-px my-10px bg-divider-stroke-lv-4" />

        {/* Info: (20250115 - Julian) basic info */}
        <div className="grid w-full grid-cols-3 gap-12px">
          {/* Info: (20250115 - Julian) Issued & Due Date */}
          {issueAndDueCard}
          {/* Info: (20250115 - Julian) Billed To */}
          {billedToCard}
          {/* Info: (20250115 - Julian) From */}
          {fromCard}
        </div>

        {/* Info: (20250115 - Julian) Plan List */}
        {planList}

        {/* Info: (20250115 - Julian) Conclusion */}
        {conclusion}

        {/* Info: (20250116 - Julian) Footer */}
        <div className="flex items-center justify-between border-t border-stroke-neutral-quaternary py-12px text-sm text-text-neutral-secondary print:mt-auto">
          <p className="font-semibold">{footnote}</p>
          <p>{t('subscriptions:INVOICE_PAGE.FOOTNOTE_PAGE')}</p>
        </div>
      </div>
    </main>
  );
};

export default InvoicePageBody;
