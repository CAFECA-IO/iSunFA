import React from 'react';
import { useTranslation } from 'next-i18next';
import OutputInvoiceItem from '@/components/invoice/output_invoice_item';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { HiCheck } from 'react-icons/hi';
import { InvoiceTab } from '@/constants/invoice_rc2';
import { CurrencyType } from '@/constants/currency';
import { IInvoiceRC2OutputUI } from '@/interfaces/invoice_rc2';

interface OutputInvoiceTableProps {
  activeTab: InvoiceTab;
  certificates: IInvoiceRC2OutputUI[];
  currencyAlias: CurrencyType;
  activeSelection: boolean; // Info: (20240923 - Anna) 是否處於選擇狀態 // Info: (20240923 - Anna) 選中的項目 ID 列表
  handleSelect: (ids: number[], isSelected: boolean) => void; // Info: (20240923 - Anna) 當選擇變更時的回調函數
  handleSelectAll: () => void;
  isSelectedAll: boolean;
  onEdit: (id: number) => void;
  dateSort: SortOrder | null;
  amountSort: SortOrder | null;
  voucherSort: SortOrder | null;
  certificateNoSort: SortOrder | null; // Info: (20250416 - Anna) 憑證號碼排序
  certificateTypeSort: SortOrder | null; // Info: (20250416 - Anna) 憑證類型排序
  setDateSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setAmountSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setVoucherSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setCertificateNoSort: React.Dispatch<React.SetStateAction<SortOrder | null>>; // Info: (20250416 - Anna) 憑證號碼排序
  setCertificateTypeSort: React.Dispatch<React.SetStateAction<SortOrder | null>>; // Info: (20250416 - Anna) 憑證類型排序
}

const OutputInvoiceTable: React.FC<OutputInvoiceTableProps> = ({
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
  certificateNoSort,
  certificateTypeSort,
  setDateSort,
  setAmountSort,
  setVoucherSort,
  setCertificateNoSort,
  setCertificateTypeSort,
}) => {
  const { t } = useTranslation('certificate');
  const displayedIssuedDate = SortingButton({
    string: t('certificate:TABLE.DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
    handleReset: () => {
      setAmountSort(null);
      setVoucherSort(null);
      setCertificateNoSort(null);
      setCertificateTypeSort(null);
    },
  });

  const displayedAmount = SortingButton({
    string: t('certificate:TABLE.AMOUNT'),
    sortOrder: amountSort,
    setSortOrder: setAmountSort,
    handleReset: () => {
      setDateSort(null);
      setVoucherSort(null);
      setCertificateNoSort(null);
      setCertificateTypeSort(null);
    },
  });

  const displayedVoucherNumber = SortingButton({
    string: t('certificate:TABLE.VOUCHER_NUMBER'),
    sortOrder: voucherSort,
    setSortOrder: setVoucherSort,
    handleReset: () => {
      setDateSort(null);
      setAmountSort(null);
      setCertificateNoSort(null);
      setCertificateTypeSort(null);
    },
  });

  // Info: (20250416 - Anna) 憑證號碼表頭
  const displayedCertificateNo = SortingButton({
    string: t('certificate:TABLE.INVOICE_NUMBER'),
    sortOrder: certificateNoSort,
    setSortOrder: setCertificateNoSort,
    handleReset: () => {
      setDateSort(null);
      setAmountSort(null);
      setVoucherSort(null);
      setCertificateTypeSort(null);
    },
  });

  // Info: (20250416 - Anna) 憑證類型表頭
  const displayedCertificateType = SortingButton({
    string: t('certificate:TABLE.INVOICE_TYPE'),
    sortOrder: certificateTypeSort,
    setSortOrder: setCertificateTypeSort,
    handleReset: () => {
      setDateSort(null);
      setAmountSort(null);
      setVoucherSort(null);
      setCertificateNoSort(null);
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
              {displayedCertificateNo}
            </div>
            <div className="col-span-full table-cell min-w-100px border-b border-r border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              {displayedCertificateType}
            </div>

            <div className="table-cell w-100px min-w-100px border-b border-r border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              {t('certificate:TABLE.TAX')}
            </div>
            <div className="col-span-full table-cell min-w-100px flex-col items-center border-b border-r border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              {t('certificate:EDIT.BUYER')}
            </div>
            <div className="table-cell w-170px min-w-170px border-b border-r border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              {displayedAmount}
            </div>
            <div className="table-cell w-120px min-w-120px flex-col items-center border-b border-stroke-neutral-quaternary px-lv-2 text-center align-middle">
              <div>{t('certificate:TABLE.UPLOADER')}</div>
              {activeTab === InvoiceTab.WITH_VOUCHER && displayedVoucherNumber}
            </div>
          </div>
        </div>

        <div className="table-row-group">
          {/* Deprecated: (20240919 - Anna) Example of dynamic rows, should map actual data here */}
          {certificates.map((certificate, index) => (
            <OutputInvoiceItem
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

export default OutputInvoiceTable;
