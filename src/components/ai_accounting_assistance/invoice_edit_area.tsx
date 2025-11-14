import React, { useState } from 'react';
import { FiEdit } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '@/components/button/button';
import { TaxType } from '@/constants/invoice_rc2';
import { numberWithCommas, timestampToString } from '@/lib/utils/common';

interface IInvoiceEditAreaProps {
  isOpen: boolean;
  toggle: () => void;
}

enum InvoiceEditTab {
  TAX_INFO = 'Tax Info',
  VOUCHER = 'Voucher',
}

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

const InvoiceEditArea: React.FC<IInvoiceEditAreaProps> = ({ isOpen, toggle }) => {
  const [invoiceEditTab, setInvoiceEditTab] = useState<InvoiceEditTab>(InvoiceEditTab.TAX_INFO);

  const { invoiceNo, issueDate, tradingPartner, taxType, taxRate, salesAmount, tax } =
    mockInvoiceDetail;

  const aiModifyStyle = 'drop-shadow-renew-halo text-text-brand-primary-lv1';

  const formattedIssueDate = timestampToString(issueDate).date;

  const tabs = Object.values(InvoiceEditTab).map((tab) => {
    const isActive = invoiceEditTab === tab;
    const clickHandler = () => setInvoiceEditTab(tab as InvoiceEditTab);
    return (
      <button
        key={tab}
        type="button"
        onClick={clickHandler}
        className={`${
          isActive
            ? 'border-tabs-stroke-active text-tabs-text-active'
            : 'border-tabs-stroke-default text-tabs-text-default'
        } border-b-2 px-12px py-8px text-base font-medium transition-all duration-200 ease-in-out`}
      >
        {tab}
      </button>
    );
  });

  const taxTypeStr =
    taxType === TaxType.TAXABLE ? (
      <p>
        Taxable
        <span className="text-input-text-primary"> {taxRate * 100}%</span>
      </p>
    ) : (
      <p>Tax Free</p>
    );

  const taxInfoTab = (
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

  // ToDo: (20251114 - Julian) During development
  const voucherTab = (
    <div className="flex flex-col gap-8px">
      <p className="ml-auto text-xs font-semibold uppercase text-text-neutral-tertiary">
        Currency: TWD
      </p>
      <div className="flex flex-col rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-main-background">
        {/* Info: (20251114 - Julian) Table Header */}
        <div className="grid grid-cols-6 border-b border-stroke-neutral-quaternary text-center text-xs font-medium text-text-neutral-tertiary">
          <div className="border-r border-stroke-neutral-quaternary">Particulars</div>
          <div className="col-span-3 border-r border-stroke-neutral-quaternary">Accounting</div>
          <div className="border-r border-stroke-neutral-quaternary">Credit</div>
          <div className="">Debit</div>
        </div>
        {/* Info: (20251114 - Julian) Table Content */}
        <div className="grid grid-cols-6 text-xs font-medium">
          <div>Printer-0001</div>
          <div className="col-span-3 flex flex-col gap-4px font-semibold text-text-neutral-tertiary">
            <div className="flex items-center gap-4px">
              <p>1141</p> <p>Accounts receivable</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabContent = invoiceEditTab === InvoiceEditTab.TAX_INFO ? taxInfoTab : voucherTab;

  return (
    <div
      className={`${isOpen ? 'translate-x-0' : 'translate-x-500px'} fixed right-0 top-0 z-10 flex h-full w-500px flex-col gap-24px bg-white/30 px-40px py-24px transition-all duration-200 ease-in-out`}
    >
      {/* Info: (20251114 - Julian) Header */}
      <div className="flex items-center">
        <button type="button" className="p-10px text-button-text-secondary" onClick={toggle}>
          <RxCross2 size={20} />
        </button>
        <p className="flex-1 text-center text-2xl font-medium text-text-neutral-primary">
          AB-12345678
        </p>
      </div>

      {/* Info: (20251114 - Julian) Image Zoom In */}
      <div
      // className="flex-1"
      >
        Image Zoom In
      </div>

      {/* Info: (20251114 - Julian) Invoice Details */}
      <div className="flex flex-col gap-24px">
        <div className="grid grid-cols-2 gap-24px">{tabs}</div>
        {tabContent}
        <div className="ml-auto">
          <Button type="button" variant="tertiary">
            <FiEdit size={20} />
            <p>Edit</p>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditArea;
