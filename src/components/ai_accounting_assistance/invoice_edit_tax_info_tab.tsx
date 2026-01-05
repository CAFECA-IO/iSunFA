import React from 'react';
import { TaxType } from '@/constants/invoice_rc2';
import { numberWithCommas, timestampToString } from '@/lib/utils/common';
import { ITaxInfo } from '@/interfaces/invoice_edit_area';

const InvoiceEditTaxInfoTab: React.FC<{ data: ITaxInfo }> = ({ data }) => {
  const { invoiceNo, issueDate, tradingPartner, taxType, taxRate, salesAmount, tax } = data;

  // ToDo: (20251121 - Julian) Change Style for AI Modify Feature testing
  // const aiModifyStyle = 'drop-shadow-renew-halo text-text-brand-primary-lv1';

  const formattedIssueDate = timestampToString(issueDate ?? 0).date;

  const taxTypeStr =
    taxType === TaxType.TAXABLE ? (
      <p>
        Taxable
        <span className="text-input-text-primary"> {Number(taxRate ?? 0) * 100}%</span>
      </p>
    ) : (
      <p>Tax Free</p>
    );

  return (
    <div className="flex flex-col gap-24px text-sm font-semibold text-text-neutral-tertiary">
      <div className="flex items-center justify-between">
        <p>Invoice No.</p>
        <p>{invoiceNo}</p>
      </div>
      <div className="flex items-center justify-between">
        <p>Issue Date</p>
        <p>{formattedIssueDate}</p>
      </div>
      <div className="flex items-center justify-between">
        <p>Trading Partner</p>
        <p>
          {tradingPartner.taxId}{' '}
          <span className="text-input-text-primary">{tradingPartner.name}</span>
        </p>
      </div>
      <div className="flex items-center justify-between">
        <p>Tax Type</p>
        {taxTypeStr}
      </div>
      <div className="flex items-center justify-between">
        <p>Sales Amount</p>
        <p>
          <span className="text-input-text-primary">
            {numberWithCommas(Number(salesAmount ?? 0))}
          </span>{' '}
          TWD
        </p>
      </div>
      {/* ToDo: (20251114 - Julian) AI Modify Style for testing, will remove later */}
      <div className="flex items-center justify-between">
        <p>Tax</p>
        <p>
          <span>{numberWithCommas(Number(tax ?? 0))}</span> TWD
        </p>
      </div>
    </div>
  );
};

export default InvoiceEditTaxInfoTab;
