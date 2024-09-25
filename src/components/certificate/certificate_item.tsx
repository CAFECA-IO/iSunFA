import React, { ReactElement } from 'react';
import { ICertificateUI } from '@/interfaces/certificate';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { HiCheck } from 'react-icons/hi';
import Image from 'next/image';

interface CertificateListIrops {
  activeSelection: boolean;
  certificate: ICertificateUI;
  handleSelect: (ids: number[], isSelected: boolean) => void;
  onEdit: (id: number) => void;
}

const BorderCell: React.FC<{ isSelected: boolean; children: ReactElement; className?: string }> = ({
  isSelected,
  children,
  className = '',
}) => {
  return (
    <div
      className={`relative table-cell min-h-72px border-b p-2 align-middle ${
        isSelected
          ? 'border-stroke-brand-primary bg-surface-brand-primary-10'
          : 'border-stroke-neutral-quaternary'
      } group-hover:border-stroke-brand-primary ${className}`}
    >
      {children}
    </div>
  );
};

const CertificateItem: React.FC<CertificateListIrops> = ({
  activeSelection,
  certificate,
  handleSelect,
  onEdit,
}) => {
  return (
    <div
      className={`group table-row text-sm text-text-neutral-primary hover:bg-surface-brand-primary-10`}
      onClick={
        activeSelection
          ? handleSelect.bind(null, [certificate.id], !certificate.isSelected)
          : onEdit.bind(null, certificate.id)
      }
    >
      {/* Info: (20240924 - tzuhan) CheckBox */}
      {activeSelection && (
        <BorderCell isSelected={certificate.isSelected}>
          <div
            className={`h-16px w-16px rounded border border-checkbox-stroke-unselected text-center ${certificate.isSelected ? 'bg-checkbox-surface-selected' : 'bg-checkbox-surface-unselected'}`}
            onClick={handleSelect.bind(null, [certificate.id], !certificate.isSelected)}
          >
            {certificate.isSelected && <HiCheck className="absolute text-neutral-white" />}
          </div>
        </BorderCell>
      )}
      <BorderCell isSelected={certificate.isSelected}>
        <CalendarIcon timestamp={new Date(certificate.date).getTime()} />
      </BorderCell>

      {/* Info: (20240924 - tzuhan) Invoice Information */}
      <BorderCell isSelected={certificate.isSelected} className="min-w-120px space-y-2">
        <>
          <div className="text-text-neutral-tertiary">{certificate.invoiceName}</div>
          <div className="text-text-neutral-primary">{certificate.invoiceNumber}</div>
        </>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="space-y-2">
        <>
          <div className="text-text-neutral-tertiary">{certificate.taxID}</div>
          <div className="text-text-neutral-primary">{certificate.fromTo}</div>
        </>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="max-w-120px">
        <div className="text-text-neutral-primary">{certificate.businessTaxFormatCode}</div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="min-w-100px">
        <div className="text-text-neutral-primary">Taxable {certificate.taxRate}%</div>
      </BorderCell>
      {/* Info: (20240924 - tzuhan) Price Information */}
      <BorderCell isSelected={certificate.isSelected}>
        <div className="flex-col items-center space-y-2">
          <div className="flex">
            <div className="mr-4 flex w-75px items-center rounded-full bg-surface-support-soft-rose px-2 py-1 text-xs">
              <div
                className={`mr-1 inline-block h-6px w-6px rounded-full bg-surface-support-strong-rose`}
              ></div>
              <div> Pre-Tax</div>
            </div>
            <div className="text-text-neutral-primary">
              {certificate.priceBeforeTax}
              <span className="ml-1 text-text-neutral-tertiary">TWD</span>
            </div>
          </div>
          <div className="flex">
            <div className="mr-4 flex w-75px items-center rounded-full bg-surface-support-soft-baby px-2 py-1 text-xs">
              <div
                className={`mr-1 inline-block h-6px w-6px rounded-full bg-surface-support-strong-baby`}
              ></div>
              <div>After-Tax</div>
            </div>
            <div className="text-text-neutral-primary">
              {certificate.totalPrice}
              <span className="ml-1 text-text-neutral-tertiary">TWD</span>
            </div>
          </div>
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected}>
        <div className="flex items-center justify-center">
          {certificate.deductible ? (
            <Image src="/elements/check.svg" alt="Yes" width={20} height={20} />
          ) : (
            <div></div>
          )}
        </div>
      </BorderCell>

      {/* Info: (20240924 - tzuhan) Voucher Information */}
      <BorderCell isSelected={certificate.isSelected} className="min-w-110px space-y-2 text-right">
        <>
          <div className="text-link-text-primary">{certificate.voucherNo}</div>
          <div className="text-text-neutral-primary">
            <span className="rounded-full bg-avatar-surface-background-indigo p-1 text-xs font-bold text-avatar-text-in-dark-background">
              TH
            </span>
            <span>{certificate.uploader}</span>
          </div>
        </>
      </BorderCell>
    </div>
  );
};

export default CertificateItem;
