import React from 'react';
import { ICertificateUI } from '@/interfaces/certificate';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { HiCheck } from 'react-icons/hi';
import Image from 'next/image';

interface CertificateListIrops {
  activeSelection: boolean;
  certificate: ICertificateUI;
  handleSelect: (ids: number[], isSelected: boolean) => void;
}

const CertificateItem: React.FC<CertificateListIrops> = ({
  activeSelection,
  certificate,
  handleSelect,
}) => {
  return (
    <div
      className={`table-row font-medium${
        certificate?.isSelected
          ? 'border-stroke-brand-primary bg-surface-brand-primary-10'
          : 'border-stroke-neutral-quaternary'
      } hover:border-stroke-brand-primary hover:bg-surface-brand-primary-10`}
    >
      {/* Info: (20240924 - tzuhan) CheckBox */}
      {activeSelection && (
        <div className="relative table-cell">
          <div
            className={`h-16px w-16px rounded border border-checkbox-stroke-unselected text-center ${certificate.isSelected ? 'bg-checkbox-surface-selected' : 'bg-checkbox-surface-unselected'}`}
            onClick={handleSelect.bind(null, [certificate.id], !certificate.isSelected)}
          >
            {certificate.isSelected && (
              <HiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-neutral-white" />
            )}
          </div>
        </div>
      )}
      <div className="relative table-cell">
        <CalendarIcon timestamp={new Date(certificate.date).getTime()} />
      </div>

      {/* Info: (20240924 - tzuhan) Invoice Information */}
      <div className="relative table-cell">
        <div className="text-sm text-text-neutral-tertiary">{certificate.invoiceName}</div>
        <div className="text-sm text-text-neutral-primary">{certificate.invoiceNumber}</div>
      </div>
      <div className="relative table-cell">
        <div className="text-sm text-text-neutral-tertiary">{certificate.taxID}</div>
        <div className="text-sm text-text-neutral-primary">{certificate.fromTo}</div>
      </div>
      <div className="relative table-cell">
        <div className="text-sm text-text-neutral-primary">{certificate.businessTaxFormatCode}</div>
      </div>
      {/* Info: (20240924 - tzuhan) 跟設計師確認
      <div className="relative table-cell">
        <div className="text-sm text-text-neutral-primary">{certificate.invoiceType}</div>
      </div> */}
      <div className="relative table-cell">
        <div className="text-sm text-text-neutral-primary">Taxable {certificate.taxRate}%</div>
      </div>
      {/* Info: (20240924 - tzuhan) Price Information */}
      <div className="relative table-cell">
        <div className="flex-col items-center">
          <div className="flex">
            <div className="mr-4 w-75px rounded-full bg-pink-100 px-2 py-1 text-xs text-pink-600">
              Pre-Tax
            </div>
            <div className="text-sm text-text-neutral-primary">
              {certificate.priceBeforeTax}
              <span className="ml-1 text-sm text-text-neutral-tertiary">TWD</span>
            </div>
          </div>
          <div className="flex">
            <div className="mr-4 w-75px rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-600">
              After-Tax
            </div>
            <div className="text-sm text-text-neutral-primary">
              {certificate.totalPrice}
              <span className="ml-1 text-sm text-text-neutral-tertiary">TWD</span>
            </div>
          </div>
        </div>
      </div>
      <div className="relative table-cell">
        <div className="flex items-center justify-center">
          {certificate.deductible ? (
            <Image src="/elements/check.svg" alt="Yes" width={20} height={20} />
          ) : (
            <div></div>
          )}
        </div>
      </div>

      {/* Info: (20240924 - tzuhan) Voucher Information */}
      <div className="relative table-cell">
        <div className="text-sm text-link-text-primary">{certificate.voucherNo}</div>
        <div className="text-sm text-text-neutral-primary">
          <span className="rounded-full bg-avatar-surface-background-indigo p-1 text-xs font-bold text-avatar-text-in-dark-background">
            TH
          </span>
          <span>{certificate.uploader}</span>
        </div>
      </div>
    </div>
  );
};

export default CertificateItem;
