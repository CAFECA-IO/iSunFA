import React from 'react';
import Pagination from '@/components/pagination/pagination';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';
import InputInvoiceTable from '@/components/certificate/input_certificate_table';
import CertificateGrid from '@/components/certificate/certificate_grid';
import { SortOrder } from '@/constants/sort';
import { InvoiceTab } from '@/constants/invoice_rc2';
import { CurrencyType } from '@/constants/currency';
import { IInvoiceRC2InputUI } from '@/interfaces/invoice_rc2';

interface InputCertificateProps {
  activeTab: InvoiceTab;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalCount: number;
  totalPages: number;
  certificates: IInvoiceRC2InputUI[]; // Info: (20240923 - Anna) 項目列表
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
  certificateTypeSort: SortOrder | null; // Info: (20250416 - Anna) 憑證類型排序
  certificateNoSort: SortOrder | null;
  setDateSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setAmountSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setVoucherSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setCertificateTypeSort: React.Dispatch<React.SetStateAction<SortOrder | null>>; // Info: (20250416 - Anna) 憑證類型排序
  setCertificateNoSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  isExporting: boolean;
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
  certificateNoSort,
  certificateTypeSort,
  setDateSort,
  setAmountSort,
  setVoucherSort,
  setCertificateTypeSort,
  setCertificateNoSort,
  isExporting,
}) => {
  return (
    <>
      {viewType === DISPLAY_LIST_VIEW_TYPE.LIST && (
        <InputInvoiceTable
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
          certificateNoSort={certificateNoSort}
          certificateTypeSort={certificateTypeSort}
          setDateSort={setDateSort}
          setAmountSort={setAmountSort}
          setVoucherSort={setVoucherSort}
          setCertificateTypeSort={setCertificateTypeSort}
          setCertificateNoSort={setCertificateNoSort}
          isExporting={isExporting}
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
