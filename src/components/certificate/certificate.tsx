import React, { useEffect, useState } from 'react';
import Pagination from '@/components/pagination/pagination';
import { ICertificateUI, VIEW_TYPES } from '@/interfaces/certificate';
import CertificateTable from '@/components/certificate/certificate_table';
import CertificateGrid from '@/components/certificate/certificate_grid';
import { SortOrder } from '@/constants/sort';

interface CertificateProps {
  activeTab: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalCount: number;
  totalPages: number;
  certificates: ICertificateUI[]; // Info: (20240923 - tzuhan) 項目列表
  viewType: VIEW_TYPES; // Info: (20240923 - tzuhan) 顯示模式
  activeSelection: boolean; // Info: (20240923 - tzuhan) 是否處於選擇狀態
  handleSelect: (ids: number[], isSelected: boolean) => void;
  isSelectedAll: boolean;
  onRemove: (id: number) => void;
  onDownload: (id: number) => void;
  onEdit: (id: number) => void;
  dateSort: SortOrder | null;
  amountSort: SortOrder | null;
  voucherSort: SortOrder | null;
  setDateSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setAmountSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  setVoucherSort: React.Dispatch<React.SetStateAction<SortOrder | null>>;
}

// Deprecated: (20240919 - tzuhan) will be replaced by actual data type

const Certificate: React.FC<CertificateProps> = ({
  activeTab,
  page,
  setPage,
  totalCount,
  totalPages,
  certificates,
  viewType,
  activeSelection,
  handleSelect,
  isSelectedAll,
  onRemove,
  onDownload,
  onEdit,
  dateSort,
  amountSort,
  voucherSort,
  setDateSort,
  setAmountSort,
  setVoucherSort,
}) => {
  const [certificatesReOrdered, setCertificatesReOrdered] =
    useState<ICertificateUI[]>(certificates);

  useEffect(() => {
    const unReadCertificates: ICertificateUI[] = [];
    const readCertificates: ICertificateUI[] = [];
    certificates.forEach((certificate) => {
      if (certificate.unRead) {
        unReadCertificates.push(certificate);
      } else {
        readCertificates.push(certificate);
      }
    });
    setCertificatesReOrdered([...unReadCertificates, ...readCertificates]);
  }, [certificates]);

  return (
    <>
      {viewType === VIEW_TYPES.LIST && (
        <CertificateTable
          activeTab={activeTab}
          certificates={certificatesReOrdered}
          activeSelection={activeSelection}
          handleSelect={handleSelect}
          isSelectedAll={isSelectedAll}
          onEdit={onEdit}
          dateSort={dateSort}
          amountSort={amountSort}
          voucherSort={voucherSort}
          setDateSort={setDateSort}
          setAmountSort={setAmountSort}
          setVoucherSort={setVoucherSort}
        />
      )}
      {viewType === VIEW_TYPES.GRID && (
        <CertificateGrid
          certificates={certificatesReOrdered}
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
          totalCount={totalCount}
          currentPage={page}
          totalPages={totalPages}
          setCurrentPage={setPage}
        />
      </div>
    </>
  );
};

export default Certificate;
