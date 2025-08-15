import React from 'react';
import { useTranslation } from 'next-i18next';
import dayjs from 'dayjs';
import { useUserCtx } from '@/contexts/user_context';
import { InvoiceType } from '@prisma/client';
import { numberWithCommas } from '@/lib/utils/common';

interface EInvoicePreviewProps {
  className?: string;
  certificateType?: InvoiceType;
  issuedDate: string;
  invoiceNo: string;
  taxId?: string;
  netAmount: string;
  taxAmount: string;
  totalAmount: string;
}

const EInvoicePreview = React.forwardRef<HTMLDivElement, EInvoicePreviewProps>(
  (
    { className, certificateType, issuedDate, invoiceNo, taxId, netAmount, taxAmount, totalAmount },
    ref
  ) => {
    const { t } = useTranslation(['certificate']);
    const { connectedAccountBook } = useUserCtx();
    const connectedAccountBookTaxId = connectedAccountBook?.taxId ?? '';
    let seller = '';
    let buyer = '';
    // Info: (20250430 - Anna) 格式35
    if (certificateType === InvoiceType.OUTPUT_35) {
      seller = connectedAccountBookTaxId;
      buyer = taxId ?? '';
      // Info: (20250430 - Anna) 格式25
    } else if (certificateType === InvoiceType.INPUT_25) {
      seller = taxId ?? '';
      buyer = connectedAccountBookTaxId;
    }

    const getInvoicePeriod = (dateStr: string) => {
      const date = dayjs(dateStr);
      const rocYear = date.year() - 1911;
      const month = date.month() + 1; // Info: (20250430 - Anna) month() 是從 0 開始
      const startMonth = month % 2 === 0 ? month - 1 : month;
      const endMonth = startMonth + 1;
      return t('certificate:EDIT.INVOICE_PERIOD', {
        year: rocYear,
        startMonth: String(startMonth).padStart(2, '0'),
        endMonth: String(endMonth).padStart(2, '0'),
      });
    };

    if (!certificateType) return null;

    return (
      <div ref={ref} className={`relative h-600px w-400px shrink-0 bg-neutral-50 ${className}`}>
        {/* Info: (20250430 - Anna) e-invoice header */}
        {/* Info: (20250622 - Anna) 為了正確被 html2canvas 捕捉，使用 <img> 而不是 <Image> */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/e_invoice_header.png" alt="e_invoice_header" width={400} height={136} />
        <p className="absolute left-0 right-0 top-8 flex justify-center text-xl font-bold leading-8 text-neutral-600">
          {t('certificate:EDIT.ELECTRONIC_INVOICE_INFO')}
        </p>
        {/* Info: (20250430 - Anna) e-invoice body */}
        <div className="flex flex-col items-center pt-4">
          <p className="text-32px font-bold leading-10 text-neutral-600">
            {getInvoicePeriod(issuedDate)}
          </p>
          <p className="pt-2 text-44px font-bold leading-52px text-neutral-600">{invoiceNo}</p>
          <div className="flex w-320px flex-col gap-4 pt-10 leading-7 tracking-wide">
            <div className="flex justify-between">
              <span className="text-lg font-medium text-neutral-300">
                {t('certificate:EDIT.INVOICE_DATE')}
              </span>
              <span className="text-lg font-semibold text-neutral-600">{issuedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-lg font-medium text-neutral-300">
                {t('certificate:EDIT.SELLER')}
              </span>
              <span className="text-lg font-semibold text-neutral-600">{seller}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-lg font-medium text-neutral-300">
                {t('certificate:EDIT.BUYER')}
              </span>
              <span className="text-lg font-semibold text-neutral-600">{buyer}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-lg font-medium text-neutral-300">
                {t('certificate:EDIT.SALES')}
              </span>
              <div className="flex gap-1 text-lg font-semibold">
                <span className="text-neutral-600">
                  {/* Info: (20250430 - Anna) 加千分位 */}
                  {numberWithCommas(netAmount)}
                </span>
                <span className="text-neutral-300">TWD</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-lg font-medium text-neutral-300">
                {t('certificate:EDIT.TAX')}
              </span>
              <div className="flex gap-1 text-lg font-semibold">
                <span className="text-neutral-600">
                  {/* Info: (20250430 - Anna) 加千分位 */}
                  {numberWithCommas(taxAmount)}
                </span>
                <span className="text-neutral-300">TWD</span>
              </div>
            </div>
          </div>
        </div>
        {/* Info: (20250430 - Anna) e-invoice bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          {/* Info: (20250622 - Anna) 為了正確被 html2canvas 捕捉，使用 <img> 而不是 <Image> */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/e_invoice_bottom.png" alt="e_invoice_bottom" width={400} height={85} />
          <div className="absolute inset-0 flex items-end justify-between px-10 pb-6 text-neutral-25">
            <p className="text-xl font-medium leading-8"> {t('certificate:EDIT.LUMP_SUM')}：</p>
            <p className="text-32px font-bold leading-10">
              {/* Info: (20250430 - Anna) 加千分位 */}
              {numberWithCommas(totalAmount)}
            </p>
            <p className="text-xl font-medium leading-8">TWD</p>
          </div>
        </div>
      </div>
    );
  }
);

EInvoicePreview.displayName = 'EInvoicePreview';
export default EInvoicePreview;
