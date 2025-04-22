import React, { ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
import { ICertificateUI } from '@/interfaces/certificate';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { HiCheck } from 'react-icons/hi';
import Image from 'next/image';
import Link from 'next/link';
import { CurrencyType } from '@/constants/currency';
import { numberWithCommas } from '@/lib/utils/common';
import { FaCheck } from 'react-icons/fa6';
import { RxCross2 } from 'react-icons/rx';

interface InputCertificateListIrops {
  activeSelection: boolean;
  certificate: ICertificateUI;
  currencyAlias: CurrencyType;
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
      className={`relative table-cell px-lv-2 align-middle ${
        isSelected ? 'bg-surface-brand-primary-10' : ''
      } group-hover:border-stroke-brand-primary ${className}`}
    >
      {children}
    </div>
  );
};

const InputCertificateItem: React.FC<InputCertificateListIrops> = ({
  activeSelection,
  certificate,
  currencyAlias,
  handleSelect,
  onEdit,
}) => {
  const { t } = useTranslation(['common', 'certificate', 'filter_section_type']);

  const isDeductible =
    certificate.invoice?.deductionType === 'DEDUCTIBLE_PURCHASE_AND_EXPENSE' ||
    certificate.invoice?.deductionType === 'DEDUCTIBLE_FIXED_ASSETS';

  return (
    <div
      className={`group table-row h-72px w-full max-w-920px overflow-y-hidden text-sm text-text-neutral-primary hover:bg-surface-brand-primary-10`}
      onClick={() => {
        if (activeSelection) {
          handleSelect([certificate.id], !certificate.isSelected);
        } else {
          onEdit(certificate.id);
        }
      }}
    >
      {/* Info: (20240924 - Anna) CheckBox */}
      {activeSelection && (
        <BorderCell isSelected={certificate.isSelected} className="max-w-32px px-8px">
          <div
            className={`h-16px w-16px rounded-xxs border border-checkbox-stroke-unselected text-center ${certificate.isSelected ? 'bg-checkbox-surface-selected' : 'bg-checkbox-surface-unselected'}`}
            onClick={() => handleSelect([certificate.id], !certificate.isSelected)}
          >
            {certificate.isSelected && <HiCheck className="absolute text-neutral-white" />}
          </div>
        </BorderCell>
      )}
      <BorderCell isSelected={certificate.isSelected} className="w-100px text-center">
        <div className="inline-block">
          <CalendarIcon timestamp={certificate.invoice?.date ?? 0} unRead={!!certificate.unRead} />
        </div>
      </BorderCell>

      {/* Info: (20240924 - Anna) Invoice Information */}
      <BorderCell isSelected={certificate.isSelected} className="flex w-120px gap-1">
        <div className="flex items-center gap-2">
          {!certificate.invoice?.isComplete && (
            <Image src="/icons/hint.svg" alt="Hint" width={16} height={16} className="min-w-16px" />
          )}
          <div className="flex flex-col">
            <div className="download-pb-4 text-text-neutral-primary">
              {certificate.invoice?.no ?? ''}
            </div>
          </div>
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="row-span-full min-w-100px">
        <div className="hide-scrollbar download-pb-4 max-h-72px w-full overflow-y-auto text-left text-text-neutral-primary">
          {certificate.invoice?.type
            ? t(`filter_section_type:FILTER_SECTION_TYPE.${certificate.invoice?.type}`)
            : ''}
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="row-span-full min-w-100px">
        <div className="hide-scrollbar download-pb-4 max-h-72px w-full overflow-y-auto text-left text-text-neutral-primary">
          {/* Info: (20250421 - Anna) deductionType */}
          {isDeductible ? (
            <div className="flex items-center gap-2">
              <FaCheck className="h-6 w-6 text-green-500" />
              <span className="text-sm text-neutral-300">
                {certificate.invoice?.deductionType === 'DEDUCTIBLE_FIXED_ASSETS'
                  ? t(`certificate:TABLE.DEDUCTIBLE_FIXED_ASSETS`)
                  : t(`certificate:TABLE.DEDUCTIBLE_PURCHASE_AND_EXPENSE`)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <RxCross2 className="h-6 w-6 text-navy-blue-400" />
              <span className="text-sm text-neutral-300">
                {certificate.invoice?.deductionType === 'NON_DEDUCTIBLE_FIXED_ASSETS'
                  ? t(`certificate:TABLE.NON_DEDUCTIBLE_FIXED_ASSETS`)
                  : t(`certificate:TABLE.NON_DEDUCTIBLE_PURCHASE_AND_EXPENSE`)}
              </span>
            </div>
          )}
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="w-100px">
        <div
          className={`download-pb-4 w-full ${certificate.invoice?.taxRatio !== undefined ? 'text-left' : 'text-center'} text-text-neutral-primary`}
        >
          {certificate.invoice?.taxRatio !== undefined
            ? `Taxable ${certificate.invoice?.taxRatio} %`
            : '-'}
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="row-span-full min-w-100px">
        <div className="flex flex-col items-center gap-2">
          <div className="w-full text-left text-text-neutral-tertiary">
            {certificate.invoice?.counterParty?.taxId ?? ''}
          </div>
          <div className="w-full text-left text-text-neutral-primary">
            {certificate.invoice?.counterParty?.name ?? ''}
          </div>
        </div>
      </BorderCell>
      {/* Info: (20240924 - Anna) Price Information */}
      <BorderCell isSelected={certificate.isSelected} className="w-170px">
        <div className="flex-col items-center space-y-2">
          <div className="flex justify-between">
            <div className="flex w-75px items-center gap-badge-gap-spacing-sm rounded-full bg-surface-support-soft-rose px-badge-spacing-x-sm py-badge-spacing-y-sm text-xs">
              <div
                className={`m-1 inline-block h-6px w-6px rounded-full bg-surface-support-strong-rose`}
              ></div>
              <div className="download-pb-3">Pre-Tax</div>
            </div>
            <div className="text-text-neutral-primary">
              {numberWithCommas(certificate.invoice?.priceBeforeTax ?? 0)}
              <span className="ml-1 w-full text-left text-text-neutral-tertiary">
                {certificate.invoice?.currencyAlias ?? currencyAlias}
              </span>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="flex w-75px items-center gap-badge-gap-spacing-sm rounded-full bg-surface-support-soft-baby px-badge-spacing-x-sm py-badge-spacing-y-sm text-xs">
              <div
                className={`m-1 inline-block h-6px w-6px rounded-full bg-surface-support-strong-baby`}
              ></div>
              <div className="download-pb-3">After-Tax</div>
            </div>
            <div className="text-text-neutral-primary">
              {numberWithCommas(certificate.invoice?.totalPrice ?? 0)}
              <span className="ml-1 w-full text-left text-text-neutral-tertiary">
                {certificate.invoice?.currencyAlias ?? currencyAlias}
              </span>
            </div>
          </div>
        </div>
      </BorderCell>

      {/* Info: (20240924 - Anna) Voucher Information */}
      <BorderCell isSelected={certificate.isSelected} className="w-120px text-center">
        <div className="flex flex-col items-center space-y-2">
          {certificate?.voucherId && (
            <Link
              href={`/users/accounting/${certificate.voucherId}?voucherNo=${certificate.voucherNo}`}
              className="text-right text-link-text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {certificate.voucherNo}
            </Link>
          )}
          <div className="flex items-center gap-2 text-right text-text-neutral-primary">
            {certificate?.uploaderUrl ? (
              <Image
                src={certificate.uploaderUrl}
                alt="avatar"
                width={14}
                height={14}
                className="rounded-full"
              />
            ) : (
              <span className="rounded-full bg-avatar-surface-background-indigo p-1 text-xs font-bold text-avatar-text-in-dark-background">
                {certificate.uploader.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span>{certificate.uploader ?? ''}</span>
          </div>
        </div>
      </BorderCell>
    </div>
  );
};

export default InputCertificateItem;
