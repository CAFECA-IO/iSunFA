import React from 'react';
import { useTranslation } from 'next-i18next';
import OutputCertificateItem from '@/components/certificate/output_certificate_item';
import { ICertificateUI } from '@/interfaces/certificate';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { HiCheck } from 'react-icons/hi';
import { InvoiceTabs } from '@/constants/certificate';
import { CurrencyType } from '@/constants/currency';

interface OutputCertificateTableProps {
  activeTab: InvoiceTabs;
  certificates: ICertificateUI[];
  currencyAlias: CurrencyType;
  activeSelection: boolean; // Info: (20240923 - Anna) 是否處於選擇狀態 // Info: (20240923 - Anna) 選中的項目 ID 列表
  handleSelect: (ids: number[], isSelected: boolean) => void; // Info: (20240923 - Anna) 當選擇變更時的回調函數
  handleSelectAll: () => void;
  isSelectedAll: boolean;
  onEdit: (id: number) => void;
  dateSort: SortOrder | null;
  amountSort: SortOrder | null;
  voucherSort: SortOrder | null;
  invoiceNoSort: SortOrder | null; // Info: (20250416 - Anna) 憑證號碼排序
  invoiceTypeSort: SortOrder | null; // Info: (20250416 - Anna) 憑證類型排序
  setDateSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setAmountSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setVoucherSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setInvoiceNoSort: React.Dispatch<React.SetStateAction<SortOrder | null>>; // Info: (20250416 - Anna) 憑證號碼排序
  setInvoiceTypeSort: React.Dispatch<React.SetStateAction<SortOrder | null>>; // Info: (20250416 - Anna) 憑證類型排序
}

const OutputCertificateTable: React.FC<OutputCertificateTableProps> = ({
  activeTab,
  activeSelection,
  certificates,
  currencyAlias,
  handleSelect,
  handleSelectAll,
  isSelectedAll,
  onEdit,
  dateSort,
  amountSort,
  voucherSort,
  invoiceNoSort,
  invoiceTypeSort,
  setDateSort,
  setAmountSort,
  setVoucherSort,
  setInvoiceNoSort,
  setInvoiceTypeSort,
}) => {
  const { t } = useTranslation('certificate');
  const displayedIssuedDate = SortingButton({
    string: t('certificate:TABLE.DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
    handleReset: () => {
      setAmountSort(null);
      setVoucherSort(null);
      setInvoiceNoSort(null);
      setInvoiceTypeSort(null);
    },
  });

  const displayedAmount = SortingButton({
    string: t('certificate:TABLE.AMOUNT'),
    sortOrder: amountSort,
    setSortOrder: setAmountSort,
    handleReset: () => {
      setDateSort(null);
      setVoucherSort(null);
      setInvoiceNoSort(null);
      setInvoiceTypeSort(null);
    },
  });

  const displayedVoucherNumber = SortingButton({
    string: t('certificate:TABLE.VOUCHER_NUMBER'),
    sortOrder: voucherSort,
    setSortOrder: setVoucherSort,
    handleReset: () => {
      setDateSort(null);
      setAmountSort(null);
      setInvoiceNoSort(null);
      setInvoiceTypeSort(null);
    },
  });

  // Info: (20250416 - Anna) 憑證號碼表頭
  const displayedInvoiceNo = SortingButton({
    string: t('certificate:TABLE.INVOICE_NUMBER'),
    sortOrder: invoiceNoSort,
    setSortOrder: setInvoiceNoSort,
    handleReset: () => {
      setDateSort(null);
      setAmountSort(null);
      setVoucherSort(null);
      setInvoiceTypeSort(null);
    },
  });

  // Info: (20250416 - Anna) 憑證類型表頭
  const displayedInvoiceType = SortingButton({
    string: t('certificate:TABLE.INVOICE_TYPE'),
    sortOrder: invoiceTypeSort,
    setSortOrder: setInvoiceTypeSort,
    handleReset: () => {
      setDateSort(null);
      setAmountSort(null);
      setVoucherSort(null);
      setInvoiceNoSort(null);
    },
  });

  return (
    // Info: (20241210 - Anna) 隱藏 scrollbar
    <div className="min-h-500px w-full flex-auto overflow-hidden rounded-md">
      <div className="table w-full rounded-md bg-surface-neutral-surface-lv2 shadow-normal_setting_brand">
        <div className="table-header-group w-full max-w-920px bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row h-60px w-full">
            {activeSelection && (
              <div className="table-cell w-32px max-w-32px border-b border-r border-stroke-neutral-quaternary px-8px text-center align-middle">
                <div
                  className={`relative h-16px w-16px rounded-xxs border border-checkbox-stroke-unselected text-center ${isSelectedAll ? 'bg-checkbox-surface-selected' : 'bg-checkbox-surface-unselected'}`}
                  onClick={handleSelectAll}
                >
                  {isSelectedAll && <HiCheck className="absolute text-neutral-white" />}
                </div>
              </div>
            )}
            <div className="table-cell w-100px min-w-100px border-b border-r border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              {displayedIssuedDate}
            </div>
            <div className="table-cell w-120px min-w-120px flex-col items-center border-b border-r border-stroke-neutral-quaternary px-lv-2 text-left align-middle">
              {displayedInvoiceNo}
            </div>
            <div className="col-span-full table-cell min-w-100px border-b border-r border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              {displayedInvoiceType}
            </div>

            <div className="table-cell w-100px min-w-100px border-b border-r border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              {t('certificate:TABLE.TAX')}
            </div>
            <div className="col-span-full table-cell min-w-100px flex-col items-center border-b border-r border-stroke-neutral-quaternary px-lv-2 text-left align-middle">
              <div>{t('certificate:TABLE.COUNTERPARTY')}</div>
              <div>
                ({t('certificate:COUNTERPARTY.CLIENT')}/{t('certificate:COUNTERPARTY.SUPPLIER')})
              </div>
            </div>
            <div className="table-cell w-170px min-w-170px border-b border-r border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              {displayedAmount}
            </div>
            <div className="table-cell w-120px min-w-120px flex-col items-center border-b border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              <div>{t('certificate:TABLE.UPLOADER')}</div>
              {activeTab === InvoiceTabs.WITH_VOUCHER && displayedVoucherNumber}
            </div>
          </div>
        </div>

        <div className="table-row-group">
          {/* Deprecated: (20240919 - Anna) Example of dynamic rows, should map actual data here */}
          {certificates.map((certificate, index) => (
            <OutputCertificateItem
              currencyAlias={currencyAlias}
              activeSelection={activeSelection}
              handleSelect={handleSelect}
              certificate={certificate}
              key={`certificate-item-${index + 1}`}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OutputCertificateTable;
