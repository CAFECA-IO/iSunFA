import React, { useState } from 'react';
import CertificateItem from '@/components/certificate/certificate_item';
import { ICertificateUI } from '@/interfaces/certificate';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { checkboxStyle } from '@/constants/display';

interface CertificateTableProps {
  data: ICertificateUI[]; // Deprecated: (20240919 - tzuhan) will be replaced by actual data type
  activeSelection: boolean; // Info: (20240923 - tzuhan) 是否處於選擇狀態 // Info: (20240923 - tzuhan) 選中的項目 ID 列表
  handleSelect: (ids: number[], isSelected: boolean) => void; // Info: (20240923 - tzuhan) 當選擇變更時的回調函數
}

// Deprecated: (20240919 - tzuhan) will be replaced by actual data type

const CertificateTable: React.FC<CertificateTableProps> = ({
  activeSelection,
  data,
  handleSelect,
}) => {
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-stroke-neutral-quaternary';
  const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  const [amountSort, setAmountSort] = useState<null | SortOrder>(null);
  // Info: (20240924 - tzuhan) Get from Julian VoucherList

  const displayedIssuedDate = SortingButton({
    string: 'Date',
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  const displayedAmount = SortingButton({
    string: 'Amount',
    sortOrder: amountSort,
    setSortOrder: setAmountSort,
  });

  return (
    <div className="table rounded-lg bg-surface-neutral-surface-lv2">
      <div className="table-header-group h-60px border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
        <div className="table-row">
          {activeSelection && (
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              <input type="checkbox" className={checkboxStyle} />
            </div>
          )}
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedIssuedDate}</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>
            <div>Invoice Name</div>
            <div>Invoice No.</div>
          </div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>Counterparty</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>Invoice Type</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>Tax</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedAmount}</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>Deductible</div>
          <div className={`${tableCellStyles} ${sideBorderStyles}`}>
            <div>Uploader</div>
            <div>Voucher No.</div>
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
          />
        ))}
      </div>
    </div>
  );
};

export default CertificateTable;
