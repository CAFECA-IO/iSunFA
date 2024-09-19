import React from 'react';
import CertificateItem from '@/components/upload_certificate/certificate_item';

// Deprecated: (20240919 - tzuhan) will be replaced by the proper data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CertificateTable = ({ data }: { data: unknown[] }) => {
  return (
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
  );
};

export default CertificateTable;
