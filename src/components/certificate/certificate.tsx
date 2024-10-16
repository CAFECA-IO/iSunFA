import React, { useState } from 'react';
import Pagination from '@/components/pagination/pagination';
import { ICertificateUI, VIEW_TYPES } from '@/interfaces/certificate';
import CertificateTable from '@/components/certificate/certificate_table';
import CertificateGrid from '@/components/certificate/certificate_grid';

interface CertificateProps {
  activeTab: number;
  data: ICertificateUI[]; // Info: (20240923 - tzuhan) 項目列表
  viewType: VIEW_TYPES; // Info: (20240923 - tzuhan) 顯示模式
  activeSelection: boolean; // Info: (20240923 - tzuhan) 是否處於選擇狀態
  handleSelect: (ids: number[], isSelected: boolean) => void;
  isSelectedAll: boolean;
  onRemove: (id: number) => void;
  onDownload: (id: number) => void;
  onEdit: (id: number) => void;
}

// Deprecated: (20240919 - tzuhan) will be replaced by actual data type

const Certificate: React.FC<CertificateProps> = ({
  activeTab,
  data,
  viewType,
  activeSelection,
  handleSelect,
  isSelectedAll,
  onRemove,
  onDownload,
  onEdit,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Info: (20240919 - tzuhan) 每頁顯示的項目數
  const totalItems = data.length; // Info: (20240919 - tzuhan) 總項目數，實際情況中可以來自 API
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <>
      {viewType === VIEW_TYPES.LIST && (
        <CertificateTable
          activeTab={activeTab}
          data={data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
          activeSelection={activeSelection}
          handleSelect={handleSelect}
          isSelectedAll={isSelectedAll}
          onEdit={onEdit}
        />
      )}
      {viewType === VIEW_TYPES.GRID && (
        <CertificateGrid
          data={data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
          activeSelection={activeSelection}
          handleSelect={handleSelect}
          onDownload={onDownload}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      )}

      {/* Info: (20240919 - tzuhan) 分頁組件 */}
      <div className="flex justify-center">
        <Pagination
          className="mt-4"
          totalCount={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </>
  );
};

export default Certificate;
