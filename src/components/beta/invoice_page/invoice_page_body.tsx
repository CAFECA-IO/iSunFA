import React from 'react';
import Image from 'next/image';
import { LuDownload } from 'react-icons/lu';
import { BiPrinter } from 'react-icons/bi';
import { Button } from '@/components/button/button';
import { ITeamInvoice } from '@/interfaces/subscription';
import { numberWithCommas, timestampToString } from '@/lib/utils/common';

interface InvoicePageBodyProps {
  invoice: ITeamInvoice;
}

const InvoicePageBody: React.FC<InvoicePageBodyProps> = ({ invoice }) => {
  const {
    id: invoiceId,
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
  } = invoice;

  const taxAmount = (subtotal * tax) / 100;

  // ToDo: (20250115 - Julian) 下載發票
  const downloadClickHandler = () => {
    // eslint-disable-next-line no-console
    console.log('Download invoice ', invoiceId);
  };

  // ToDo: (20250115 - Julian) 列印發票
  const printClickHandler = () => {
    // eslint-disable-next-line no-console
    console.log('Print invoice ', invoiceId);
  };

  const issueAndDueCard = (
    <div className="flex h-150px flex-col gap-16px rounded-md bg-surface-brand-primary-10 px-40px py-12px font-semibold">
      {/* Info: (20250115 - Julian) Issued Date */}
      <div className="flex flex-col items-start gap-6px">
        <p className="text-text-brand-primary-lv1">Issued</p>
        <p className="text-xs text-text-neutral-secondary">
          {timestampToString(issuedTimestamp / 1000).date}
        </p>
      </div>
      {/* Info: (20250115 - Julian) Due Date */}
      <div className="flex flex-col items-start gap-6px">
        <p className="text-text-brand-primary-lv1">Due</p>
        <p className="text-xs text-text-neutral-secondary">
          {timestampToString(dueTimestamp / 1000).date}
        </p>
      </div>
    </div>
  );

  const billedToCard = (
    <div className="flex h-150px flex-col gap-6px rounded-md bg-surface-brand-primary-10 px-40px py-12px">
      <p className="font-semibold text-text-brand-primary-lv1">Billed to</p>
      <div className="flex flex-col items-start gap-4px">
        <p className="text-xs font-semibold text-text-neutral-secondary">{payer.name}</p>
        <p className="text-xs text-text-neutral-secondary">{payer.address}</p>
        <p className="text-xs text-text-neutral-secondary">{payer.phone}</p>
        {/* Info: (20250115 - Julian) Tax ID */}
        <div className="text-xs text-text-neutral-secondary">
          <span className="font-semibold uppercase">TAX ID </span>
          {payer.taxId}
        </div>
      </div>
    </div>
  );

  const fromCard = (
    <div className="flex h-150px flex-col gap-6px rounded-md bg-surface-brand-primary-10 px-40px py-12px">
      <p className="font-semibold text-text-brand-primary-lv1">From</p>
      <div className="flex flex-col items-start gap-4px">
        <p className="text-xs font-semibold text-text-neutral-secondary">{payee.name}</p>
        <p className="text-xs text-text-neutral-secondary">{payee.address}</p>
        <p className="text-xs text-text-neutral-secondary">{payee.phone}</p>
        {/* Info: (20250115 - Julian) Tax ID */}
        <div className="text-xs text-text-neutral-secondary">
          <span className="font-semibold uppercase">TAX ID </span>
          {payee.taxId}
        </div>
      </div>
    </div>
  );

  const planList = (
    <div className="flex w-full flex-col divide-y divide-stroke-neutral-quaternary">
      {/* Info: (20250115 - Julian) title */}
      <div className="flex items-center gap-50px py-12px text-sm font-semibold text-text-neutral-tertiary">
        <p className="flex-1">Description</p>
        <p className="w-80px text-center">Qty</p>
        <p className="w-80px text-center">Unit price</p>
        <p className="w-80px text-right">Amount</p>
      </div>
      {/* Info: (20250115 - Julian) content */}
      <div className="flex items-center gap-50px py-12px text-sm text-text-neutral-primary">
        <div className="flex flex-1 flex-col items-start">
          <p className="font-semibold">Professional Plan</p>
          <p>2024/08/01 to 2024/08/31</p>
        </div>
        <p className="w-80px text-center">{planQuantity}</p>
        <p className="w-80px text-center">$ {numberWithCommas(planUnitPrice)} TWD</p>
        <p className="w-80px text-right">$ {numberWithCommas(planAmount)} TWD</p>
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
      <div className="flex flex-col gap-24px bg-surface-neutral-surface-lv2 px-40px py-24px">
        {/* Info: (20250115 - Julian) Invoice Title */}
        <div className="flex items-center justify-between">
          {/* Info: (20250115 - Julian) Invoice Id */}
          <div className="flex flex-col items-start">
            <h1 className="text-3xl font-bold text-text-neutral-primary">Invoice</h1>
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
        <div className="ml-auto flex w-200px flex-col items-end divide-y divide-stroke-neutral-quaternary border-y border-stroke-neutral-quaternary">
          {/* Info: (20250115 - Julian) Subtotal */}
          <div className="flex w-full items-center justify-between py-10px">
            <p className="font-semibold text-text-neutral-primary">Subtotal</p>
            <p className="text-right font-medium text-text-neutral-tertiary">
              $ {numberWithCommas(subtotal)} TWD
            </p>
          </div>
          {/* Info: (20250115 - Julian) Tax */}
          <div className="flex w-full items-center justify-between py-10px">
            <p className="font-semibold text-text-neutral-primary">Tax ({tax}%)</p>
            <p className="text-right font-medium text-text-neutral-tertiary">
              $ {numberWithCommas(taxAmount)} TWD
            </p>
          </div>
          {/* Info: (20250115 - Julian) Total */}
          <div className="flex w-full items-center justify-between py-10px">
            <p className="font-semibold text-text-neutral-primary">Total</p>
            <p className="text-right font-medium text-text-neutral-tertiary">
              $ {numberWithCommas(total)} TWD
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default InvoicePageBody;
