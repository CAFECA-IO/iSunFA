import React, { ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { HiCheck } from 'react-icons/hi';
import Image from 'next/image';
import Link from 'next/link';
import { numberWithCommas } from '@/lib/utils/common';
import { IInvoiceRC2OutputUI } from '@/interfaces/invoice_rc2';
import { TaxType } from '@/constants/invoice_rc2';
import { useCurrencyCtx } from '@/contexts/currency_context';

interface OutputInvoiceListIrops {
  activeSelection: boolean;
  certificate: IInvoiceRC2OutputUI;
  handleSelect: (ids: number[], isSelected: boolean) => void;
  onEdit: (id: number) => void;
  uploaderAvatarMap: Record<string, string>;
  isExporting: boolean;
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

const OutputInvoiceItem: React.FC<OutputInvoiceListIrops> = ({
  activeSelection,
  certificate,
  handleSelect,
  onEdit,
  uploaderAvatarMap,
  isExporting,
}) => {
  const { t } = useTranslation(['common', 'certificate', 'filter_section_type']);
  const { currency } = useCurrencyCtx();

  // Info: (20250526 - Anna) 上傳者圖像的 url
  const avatarSrc = uploaderAvatarMap[certificate.uploaderName];

  return (
    <div
      className={`group table-row h-72px w-full max-w-920px overflow-y-hidden text-sm text-text-neutral-primary odd:bg-surface-neutral-surface-lv2 even:bg-surface-neutral-surface-lv1 hover:bg-surface-brand-primary-10`}
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
          <CalendarIcon
            timestamp={certificate.issuedDate ?? 0}
            incomplete={!!certificate.incomplete}
            isExporting={isExporting}
          />
        </div>
      </BorderCell>

      {/* Info: (20240924 - Anna) Invoice Information */}
      <BorderCell isSelected={certificate.isSelected} className="flex w-120px gap-1">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className={`${isExporting ? 'pb-4' : ''} text-text-neutral-primary`}>
              {certificate.no ?? ''}
            </div>
          </div>
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="row-span-full min-w-100px">
        <div
          className={`${isExporting ? 'pb-4' : ''} hide-scrollbar max-h-72px w-full overflow-y-auto text-left text-text-neutral-primary`}
        >
          {certificate.type ? t(`filter_section_type:FILTER_SECTION_TYPE.${certificate.type}`) : ''}
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="w-100px">
        <div
          className={`${isExporting ? 'pb-4' : ''} w-full ${certificate.taxRate !== undefined ? 'text-left' : 'text-center'} text-text-neutral-primary`}
        >
          {certificate.taxType === TaxType.TAXABLE
            ? `${t('certificate:EDIT.TAXABLE_5')} ${certificate.taxRate} %`
            : certificate.taxType === TaxType.TAX_FREE
              ? `${t('certificate:EDIT.TAX_FREE')} `
              : '-'}
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="row-span-full min-w-100px">
        <div className={`${isExporting ? 'pb-4' : ''} flex flex-col items-center gap-2`}>
          <div className="w-full text-left text-text-neutral-tertiary">
            {certificate.buyerIdNumber ?? ''}
          </div>
          <div className="w-full text-left text-text-neutral-primary">
            {certificate.buyerName ?? ''}
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
              <div className={`${isExporting ? 'pb-3' : ''} w-full pr-1 text-center`}>
                {t(`certificate:TABLE.PRE_TAX`)}
              </div>
            </div>
            <div className="text-text-neutral-primary">
              {numberWithCommas(certificate.netAmount ?? 0)}
              <span className="ml-1 w-full text-left text-text-neutral-tertiary">{currency}</span>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="flex w-75px items-center gap-badge-gap-spacing-sm rounded-full bg-surface-support-soft-baby px-badge-spacing-x-sm py-badge-spacing-y-sm text-xs">
              <div
                className={`m-1 inline-block h-6px w-6px rounded-full bg-surface-support-strong-baby`}
              ></div>
              <div className={`${isExporting ? 'pb-3' : ''} w-full pr-1 text-center`}>
                {t(`certificate:TABLE.AFTER_TAX`)}
              </div>
            </div>
            <div className="text-text-neutral-primary">
              {numberWithCommas(certificate.totalAmount ?? 0)}
              <span className="ml-1 w-full text-left text-text-neutral-tertiary">{currency}</span>
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
            {/* Info: (20250526 - Anna) 上傳者 */}
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt="avatar"
                width={14}
                height={14}
                className={`${isExporting ? 'hidden' : ''} rounded-full`}
              />
            ) : (
              <span className="rounded-full bg-avatar-surface-background-indigo p-1 text-xs font-bold text-avatar-text-in-dark-background">
                {certificate.uploaderName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className={`${isExporting ? 'pb-4' : ''}`}>{certificate.uploaderName ?? ''}</span>
          </div>
        </div>
      </BorderCell>
    </div>
  );
};

export default OutputInvoiceItem;
