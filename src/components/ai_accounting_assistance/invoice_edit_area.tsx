import React, { useState, useEffect } from 'react';
import { FiEdit } from 'react-icons/fi';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '@/components/button/button';
import InvoiceEditTaxInfoTab from '@/components/ai_accounting_assistance/invoice_edit_tax_info_tab';
import InvoiceEditVoucherTab from '@/components/ai_accounting_assistance/invoice_edit_voucher_tab';
import ImageZoom from '@/components/image_zoom/image_zoom';
import TaxEditModal from '@/components/ai_accounting_assistance/tax_edit_modal';
import VoucherEditModal from '@/components/ai_accounting_assistance/voucher_edit_modal';
import { IFaithCertificate } from '@/interfaces/faith';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';

interface IInvoiceEditAreaProps {
  isOpen: boolean;
  toggle: () => void;
  invoiceId: string;
}

enum InvoiceEditTab {
  TAX_INFO = 'Tax Info',
  VOUCHER = 'Voucher',
}

// ToDo: (20251121 - Julian) 補上 Loading Skeleton

const InvoiceEditArea: React.FC<IInvoiceEditAreaProps> = ({ isOpen, toggle, invoiceId }) => {
  const [invoiceData, setInvoiceData] = useState<IFaithCertificate | null>(null);
  const [invoiceEditTab, setInvoiceEditTab] = useState<InvoiceEditTab>(InvoiceEditTab.TAX_INFO);
  const [isOpenTaxEditModal, setIsTaxOpenEditModal] = useState<boolean>(false);
  const [isOpenVoucherEditModal, setIsVoucherOpenEditModal] = useState<boolean>(false);

  // ToDo: (20251121 - Julian) 目前先用固定的 sessionId
  const params = { sessionId: '123', certificateId: invoiceId };

  const { trigger: getInvoice } = APIHandler<IFaithCertificate>(
    APIName.GET_CERTIFICATE_BY_ID_IN_FAITH_SESSION,
    { params }
  );

  useEffect(() => {
    const fetchInvoiceData = async () => {
      const { data, success } = await getInvoice({ params });
      if (data && success) {
        setInvoiceData(data);
      } else {
        setInvoiceData(null);
      }
    };
    fetchInvoiceData();
  }, [invoiceId, isOpen]);

  const toggleTaxEditModal = () => setIsTaxOpenEditModal((prev) => !prev);
  const toggleVoucherEditModal = () => setIsVoucherOpenEditModal((prev) => !prev);

  const editBtnClickHandler = () => {
    if (invoiceEditTab === InvoiceEditTab.TAX_INFO) {
      toggleTaxEditModal();
    } else {
      toggleVoucherEditModal();
    }
  };

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
        } border-b-2 px-12px py-8px text-base font-medium transition-all duration-200 ease-in-out disabled:border-tabs-stroke-disable disabled:text-tabs-text-disable`}
      >
        {tab}
      </button>
    );
  });

  const lineItems =
    invoiceData?.voucherInfo?.lineItems.map((item) => ({
      account: item.account,
      description: item.description,
      debit: item.debit,
      amount: Number(item.amount),
    })) || [];
  const sum = {
    debit: invoiceData?.voucherInfo?.sum.debit || true,
    amount: Number(invoiceData?.voucherInfo?.sum.amount) || 0,
  };

  const tabContent =
    invoiceEditTab === InvoiceEditTab.TAX_INFO
      ? invoiceData?.taxInfo && <InvoiceEditTaxInfoTab data={invoiceData.taxInfo} />
      : invoiceData?.voucherInfo && <InvoiceEditVoucherTab lineItems={lineItems} sum={sum} />;

  return (
    <>
      <div
        className={`${isOpen ? 'translate-x-0' : 'translate-x-500px'} fixed right-0 top-0 z-10 flex h-full w-500px flex-col bg-white/30 px-40px py-24px transition-all duration-200 ease-in-out`}
      >
        {/* Info: (20251114 - Julian) Header */}
        <div className="flex items-center">
          <button type="button" className="p-10px text-button-text-secondary" onClick={toggle}>
            <RxCross2 size={20} />
          </button>
          <p className="flex-1 text-center text-2xl font-medium text-text-neutral-primary">
            {invoiceData?.id}
          </p>
        </div>

        <div className="flex flex-col gap-24px overflow-y-auto">
          {/* Info: (20251117 - Julian) Image Zoom In */}
          {invoiceData && (
            <div>
              <ImageZoom
                imageUrl={invoiceData.image}
                className="h-450px w-full"
                controlPosition="bottom-right"
                isControlBackground
              />
            </div>
          )}

          {/* Info: (20251114 - Julian) Invoice Details */}
          <div className="flex flex-col gap-24px">
            <div className="grid grid-cols-2 gap-24px">{tabs}</div>
            {tabContent}
            <div className="ml-auto">
              <Button
                type="button"
                variant="tertiary"
                disabled // ToDo: (20251126 - Julian) Voucher Edit Modal 尚未完成，先鎖住
                onClick={editBtnClickHandler}
              >
                <FiEdit size={20} />
                <p>Edit</p>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20251120 - Julian) Edit Modal */}
      {invoiceData?.taxInfo && (
        <TaxEditModal
          isModalOpen={isOpenTaxEditModal}
          onClose={toggleTaxEditModal}
          imageUrl={invoiceData.image}
          taxInfoData={invoiceData.taxInfo}
        />
      )}

      <VoucherEditModal isModalOpen={isOpenVoucherEditModal} onClose={toggleVoucherEditModal} />
    </>
  );
};

export default InvoiceEditArea;
