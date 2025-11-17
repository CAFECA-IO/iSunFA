import React from 'react';
import { TaxType } from '@/constants/invoice_rc2';
import { numberWithCommas, timestampToString } from '@/lib/utils/common';

interface IInvoiceDetail {
  invoiceNo: string;
  issueDate: number;
  tradingPartner: {
    name: string;
    taxId: string;
  };
  taxType: TaxType;
  taxRate: number;
  salesAmount: number;
  tax: number;
}

const mockInvoiceDetail: IInvoiceDetail = {
  invoiceNo: 'AB-12345678',
  issueDate: 1762109170,
  tradingPartner: {
    name: 'XYZ Corporation',
    taxId: '12345678',
  },
  taxType: TaxType.TAXABLE,
  taxRate: 0.05,
  salesAmount: 10000,
  tax: 500,
};

const InvoiceEditTaxInfoTab: React.FC = () => {
  const { invoiceNo, issueDate, tradingPartner, taxType, taxRate, salesAmount, tax } =
    mockInvoiceDetail;

  const aiModifyStyle = 'drop-shadow-renew-halo text-text-brand-primary-lv1';

  const formattedIssueDate = timestampToString(issueDate).date;

  const taxTypeStr =
    taxType === TaxType.TAXABLE ? (
      <p>
        Taxable
        <span className="text-input-text-primary"> {taxRate * 100}%</span>
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
          <span className="text-input-text-primary">{numberWithCommas(salesAmount)}</span> TWD
        </p>
      </div>
      {/* ToDo: (20251114 - Julian) AI Modify Style for testing, will remove later */}
      <div className="flex items-center justify-between">
        <p className={aiModifyStyle}>Tax</p>
        <p>
          <span className={aiModifyStyle}>{numberWithCommas(tax)}</span> TWD
        </p>
      </div>
    </div>
  );
};

export default InvoiceEditTaxInfoTab;
