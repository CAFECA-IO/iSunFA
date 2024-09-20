import { ICertificate } from '@/interfaces/certificate';
import React from 'react';

interface CertificateItemProps {
  data: ICertificate; // Deprecated: (20240919 - tzuhan) will be replaced by actual data type
}

const CertificateItem: React.FC<CertificateItemProps> = ({ data }) => {
  const {
    date,
    invoiceName,
    taxID,
    businessTaxFormatCode,
    deductible,
    priceBeforeTax,
    tax,
    totalPrice,
    voucherNo,
  } = data;
  return (
    <tr>
      <td className="p-2">{date}</td>
      <td className="p-2">{invoiceName}</td>
      <td className="p-2">{taxID}</td>
      <td className="p-2">{businessTaxFormatCode}</td>
      <td className="p-2">{deductible}</td>
      <td className="p-2">{priceBeforeTax}</td>
      <td className="p-2">{tax}</td>
      <td className="p-2">{totalPrice}</td>
      <td className="p-2">{voucherNo}</td>
    </tr>
  );
};

export default CertificateItem;
