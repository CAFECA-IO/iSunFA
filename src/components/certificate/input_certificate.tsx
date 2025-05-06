import React from 'react';
import Pagination from '@/components/pagination/pagination';
import { ICertificateUI } from '@/interfaces/certificate';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';
import InputCertificateTable from '@/components/certificate/input_certificate_table';
import CertificateGrid from '@/components/certificate/certificate_grid';
import { SortOrder } from '@/constants/sort';
import { InvoiceTabs } from '@/constants/certificate';
import { CurrencyType } from '@/constants/currency';

interface InputCertificateProps {
  activeTab: InvoiceTabs;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalCount: number;
  totalPages: number;
  certificates: ICertificateUI[]; // Info: (20240923 - Anna) 項目列表
  currencyAlias: CurrencyType;
  viewType?: DISPLAY_LIST_VIEW_TYPE; // Info: (20240923 - Anna) 顯示模式
  activeSelection: boolean; // Info: (20240923 - Anna) 是否處於選擇狀態
  handleSelect: (ids: number[], isSelected: boolean) => void;
  handleSelectAll: () => void;
  isSelectedAll: boolean;
  onRemove: (id: number) => void;
  onDownload: (id: number) => void;
  onEdit: (id: number) => void;
  dateSort: SortOrder | null;
  amountSort: SortOrder | null;
  voucherSort: SortOrder | null;
  invoiceTypeSort: SortOrder | null; // Info: (20250416 - Anna) 憑證類型排序
  setDateSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setAmountSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setVoucherSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setInvoiceTypeSort: React.Dispatch<React.SetStateAction<SortOrder | null>>; // Info: (20250416 - Anna) 憑證類型排序
  isExportModalOpen: boolean; // Info: (20250506 - Anna)
}

// Deprecated: (20240919 - Anna) will be replaced by actual data type
const InputCertificate: React.FC<InputCertificateProps> = ({
  activeTab,
  page,
  setPage,
  totalCount,
  totalPages,
  certificates,
  currencyAlias,
  viewType,
  activeSelection,
  handleSelect,
  handleSelectAll,
  isSelectedAll,
  onRemove,
  onDownload,
  onEdit,
  dateSort,
  amountSort,
  voucherSort,
  invoiceTypeSort,
  setDateSort,
  setAmountSort,
  setVoucherSort,
  setInvoiceTypeSort,
  isExportModalOpen, // Info: (20250506 - Anna)
}) => {
  return (
    <>
      {viewType === DISPLAY_LIST_VIEW_TYPE.LIST && (
        <InputCertificateTable
          activeTab={activeTab}
          certificates={certificates}
          currencyAlias={currencyAlias}
          activeSelection={activeSelection}
          handleSelect={handleSelect}
          handleSelectAll={handleSelectAll}
          isSelectedAll={isSelectedAll}
          onEdit={onEdit}
          dateSort={dateSort}
          amountSort={amountSort}
          voucherSort={voucherSort}
          invoiceTypeSort={invoiceTypeSort}
          setDateSort={setDateSort}
          setAmountSort={setAmountSort}
          setVoucherSort={setVoucherSort}
          setInvoiceTypeSort={setInvoiceTypeSort}
          isExportModalOpen={isExportModalOpen} // Info: (20250506 - Anna)
        />
      )}
      {viewType === DISPLAY_LIST_VIEW_TYPE.GRID && (
        <CertificateGrid
          certificates={certificates}
          activeSelection={activeSelection}
          handleSelect={handleSelect}
          onDownload={onDownload}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      )}

      {/* Info: (20240919 - Anna) 分頁組件 */}
      <div className="flex justify-center">
        <Pagination
          className="mt-4"
          totalCount={totalCount}
          currentPage={page}
          totalPages={totalPages}
          setCurrentPage={setPage}
        />
      </div>
    </>
  );
};

export default InputCertificate;
