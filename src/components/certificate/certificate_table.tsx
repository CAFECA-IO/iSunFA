import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import CertificateItem from '@/components/certificate/certificate_item';
import { ICertificateUI } from '@/interfaces/certificate';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { HiCheck } from 'react-icons/hi';

interface CertificateTableProps {
  activeTab: number;
  data: ICertificateUI[]; // Deprecated: (20240919 - tzuhan) will be replaced by actual data type
  activeSelection: boolean; // Info: (20240923 - tzuhan) 是否處於選擇狀態 // Info: (20240923 - tzuhan) 選中的項目 ID 列表
  handleSelect: (ids: number[], isSelected: boolean) => void; // Info: (20240923 - tzuhan) 當選擇變更時的回調函數
  isSelectedAll: boolean;
  onEdit: (id: number) => void;
}

// Deprecated: (20240919 - tzuhan) will be replaced by actual data type

const CertificateTable: React.FC<CertificateTableProps> = ({
  activeTab,
  activeSelection,
  data,
  handleSelect,
  isSelectedAll,
  onEdit,
}) => {
  const { t } = useTranslation('certificate');
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [amountSort, setAmountSort] = useState<null | SortOrder>(null);
  const [voucherSort, setVoucherSort] = useState<null | SortOrder>(null);
  // Info: (20240924 - tzuhan) Get from Julian VoucherList

  const displayedIssuedDate = SortingButton({
    string: t('certificate:TABLE.DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  const displayedAmount = SortingButton({
    string: t('certificate:TABLE.AMOUNT'),
    sortOrder: amountSort,
    setSortOrder: setAmountSort,
  });

  const displayedVoucherNumber = SortingButton({
    string: t('certificate:TABLE.VOUCHER_NUMBER'),
    sortOrder: voucherSort,
    setSortOrder: setVoucherSort,
  });

  return (
    <div className="min-h-500px w-full flex-auto overflow-x-scroll">
      <div className="table w-full border border-stroke-neutral-quaternary bg-surface-neutral-surface-lv2">
        <div className="table-header-group h-60px w-full bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row w-full">
            {activeSelection && (
              <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
                <div
                  className={`relative h-16px w-16px rounded border border-checkbox-stroke-unselected text-center ${isSelectedAll ? 'bg-checkbox-surface-selected' : 'bg-checkbox-surface-unselected'}`}
                >
                  {isSelectedAll && <HiCheck className="absolute text-neutral-white" />}
                </div>
              </div>
            )}
            <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
              {displayedIssuedDate}
            </div>
            <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
              <div>{t('certificate:TABLE.INVOICE_NAME')}</div>
              <div>{t('certificate:TABLE.INVOICE_NUMBER')}</div>
            </div>
            <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
              {t('certificate:TABLE.COUNTERPARTY')}
            </div>
            <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
              {t('certificate:TABLE.INVOICE_TYPE')}
            </div>
            <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
              {t('certificate:TABLE.TAX')}
            </div>
            <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
              {displayedAmount}
            </div>
            <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-2 text-center align-middle">
              {t('certificate:TABLE.DEDUCTABLE')}
            </div>
            <div className="table-cell border-b border-stroke-neutral-quaternary p-2 text-center align-middle">
              <div>{t('certificate:TABLE.UPLOADER')}</div>
              {activeTab === 1 && displayedVoucherNumber}
            </div>
          </div>
        </div>

        <div className="table-row-group">
          {/* Deprecated: (20240919 - tzuhan) Example of dynamic rows, should map actual data here */}
          {data.map((certificate, index) => (
            <CertificateItem
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

export default CertificateTable;
