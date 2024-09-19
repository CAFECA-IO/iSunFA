import React, { useState } from 'react';
import CertificateItem from '@/components/upload_certificate/certificate_item';
import Pagination from '@/components/upload_certificate/pagination'; // 引入 Pagination 組件

const CertificateTable: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Info: (20240919 - tzuhan) 每頁顯示的項目數
  const totalItems = 100; // Info: (20240919 - tzuhan) 總項目數，實際情況中可以來自 API
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="rounded-lg bg-white p-4">
      <div className="overflow-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="p-2">Date</th>
              <th className="p-2">Invoice Name/No.</th>
              <th className="p-2">From / To-Tax ID</th>
              <th className="p-2">Business Tax Format Code</th>
              <th className="p-2">Deductible</th>
              <th className="p-2">Price before tax</th>
              <th className="p-2">Tax</th>
              <th className="p-2">Total price</th>
              <th className="p-2">Voucher No</th>
            </tr>
          </thead>
          <tbody>
            {/* Deprecated: (20240919 - tzuhan) Example of dynamic rows, should map actual data here */}
            {[...Array(10)].map((_, index) => (
              <CertificateItem key={`certificate-item-${index + 1}`} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Info: (20240919 - tzuhan) 分頁組件 */}
      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
};

export default CertificateTable;
