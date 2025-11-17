import React, { useState } from 'react';
import { FiEdit } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '@/components/button/button';
import InvoiceEditTaxInfoTab from '@/components/ai_accounting_assistance/invoice_edit_tax_info_tab';
import InvoiceEditVoucherTab from '@/components/ai_accounting_assistance/invoice_edit_voucher_tab';
import ImageZoom from '@/components/image_zoom/image_zoom';
import { IInvoiceData } from '@/interfaces/invoice_edit_area';

interface IInvoiceEditAreaProps {
  isOpen: boolean;
  toggle: () => void;
  invoiceData: IInvoiceData;
}

enum InvoiceEditTab {
  TAX_INFO = 'Tax Info',
  VOUCHER = 'Voucher',
}

const InvoiceEditArea: React.FC<IInvoiceEditAreaProps> = ({ isOpen, toggle, invoiceData }) => {
  const [invoiceEditTab, setInvoiceEditTab] = useState<InvoiceEditTab>(InvoiceEditTab.TAX_INFO);

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

  const tabContent =
    invoiceEditTab === InvoiceEditTab.TAX_INFO ? (
      <InvoiceEditTaxInfoTab data={invoiceData.taxInfo} />
    ) : (
      <InvoiceEditVoucherTab lineItems={invoiceData.voucherInfo.lineItemsInfo} />
    );

  return (
    <div
      className={`${isOpen ? 'translate-x-0' : 'translate-x-500px'} fixed right-0 top-0 z-10 flex h-full w-500px flex-col gap-24px overflow-y-auto bg-white/30 px-40px py-24px transition-all duration-200 ease-in-out`}
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

      {/* Info: (20251117 - Julian) Image Zoom In */}
      <div>
        <ImageZoom
          imageUrl={'/elements/auditing_tool_1.png'}
          className="h-450px w-full"
          controlPosition="bottom-right"
        />
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
