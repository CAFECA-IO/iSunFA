import React from 'react';
import Pagination from '@/components/pagination/pagination';
import { DISPLAY_LIST_VIEW_TYPE } from '@/constants/display';
import OutputInvoiceTable from '@/components/invoice/output_invoice_table';
import CertificateGrid from '@/components/certificate/certificate_grid';
import { SortOrder } from '@/constants/sort';
import { InvoiceTab } from '@/constants/invoice_rc2';
import { IInvoiceRC2OutputUI } from '@/interfaces/invoice_rc2';

interface OutputInvoiceProps {
  activeTab: InvoiceTab;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalCount: number;
  totalPages: number;
  certificates: IInvoiceRC2OutputUI[]; // Info: (20240923 - Anna) 項目列表
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
  certificateNoSort: SortOrder | null; // Info: (20250416 - Anna) 憑證號碼排序
  certificateTypeSort: SortOrder | null; // Info: (20250416 - Anna) 憑證類型排序
  setDateSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setAmountSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setVoucherSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setCertificateNoSort: React.Dispatch<React.SetStateAction<SortOrder | null>>; // Info: (20250416 - Anna) 憑證號碼排序
  setCertificateTypeSort: React.Dispatch<React.SetStateAction<SortOrder | null>>; // Info: (20250416 - Anna) 憑證類型排序
  isExporting: boolean;
  uploaderAvatarMap: Record<string, string>;
}

// Info: (20240919 - Anna) will be replaced by actual data type
const OutputInvoice: React.FC<OutputInvoiceProps> = ({
  activeTab,
  page,
  setPage,
  totalCount,
  totalPages,
  certificates,
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
  setCertificateNoSort,
  setCertificateTypeSort,
  isExporting,
  uploaderAvatarMap,
}) => {
  return (
    <>
      {viewType === DISPLAY_LIST_VIEW_TYPE.LIST && (
        <OutputInvoiceTable
          activeTab={activeTab}
          certificates={certificates}
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
          setCertificateNoSort={setCertificateNoSort}
          setCertificateTypeSort={setCertificateTypeSort}
          isExporting={isExporting}
          uploaderAvatarMap={uploaderAvatarMap}
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
          isExporting={isExporting}
        />
      </div>
    </>
  );
};

export default OutputInvoice;
