import React, { ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
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

/**
 * Info: (20241213 - tzuhan) 簡化文件名稱，適配中英文字符
 * @param name 文件名稱
 * @param maxWidth 最大顯示寬度（如 120 px）
 * @returns 簡化後的文件名稱
 */
export const simplifyFileName = (name: string): string => {
  const isChinese = (char: string) => /[\u4e00-\u9fff]/.test(char);
  const getMaxLengths = (hasChinese: boolean) => {
    return hasChinese
      ? { maxBaseLength: 4, maxExtensionLength: 4 }
      : { maxBaseLength: 8, maxExtensionLength: 4 };
  };

  const extensionIndex = name.lastIndexOf('.');
  const extension = extensionIndex !== -1 ? name.slice(extensionIndex) : '';
  const baseName = extensionIndex !== -1 ? name.slice(0, extensionIndex) : name;

  // Info: (20241216 - tzuhan) 確認名稱是否包含中文
  const hasChinese = [...baseName].some(isChinese);
  const { maxBaseLength, maxExtensionLength } = getMaxLengths(hasChinese);

  // Info: (20241216 - tzuhan) 簡化副檔名
  const simplifiedExtension =
    extension.length > maxExtensionLength
      ? `${extension.slice(0, maxExtensionLength - 1)}..`
      : extension;

  // Info: (20241216 - tzuhan) 簡化主名稱
  const simplifiedBaseName =
    [...baseName].length > maxBaseLength
      ? `${[...baseName].slice(0, maxBaseLength).join('')}..`
      : baseName;

  return `${simplifiedBaseName}${simplifiedExtension}`;
};

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

const CertificateItem: React.FC<CertificateListIrops> = ({
  activeSelection,
  certificate,
  handleSelect,
  onEdit,
}) => {
  const { t } = useTranslation(['common', 'certificate', 'filter_section_type']);

  return (
    <div
      className={`group table-row h-72px w-full max-w-920px overflow-y-hidden text-sm text-text-neutral-primary hover:bg-surface-brand-primary-10`}
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
      <BorderCell isSelected={certificate.isSelected} className="w-100px text-center">
        <div className="inline-block">
          <CalendarIcon timestamp={certificate.invoice?.date ?? 0} unRead={!!certificate.unRead} />
        </div>
      </BorderCell>

      {/* Info: (20240924 - tzuhan) Invoice Information */}
      <BorderCell
        isSelected={certificate.isSelected}
        className="flex w-120px gap-1 overflow-hidden"
      >
        <div className="flex items-center space-x-2">
          {!certificate.invoice?.isComplete && (
            <Image src="/icons/hint.svg" alt="Hint" width={16} height={16} className="min-w-16px" />
          )}
          <div className="flex flex-col space-y-2">
            <div className="text-text-neutral-tertiary">
              {simplifyFileName(certificate.name) ?? ''}
            </div>
            <div className="text-text-neutral-primary">{certificate.invoice?.no ?? ''}</div>
          </div>
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="w-100px">
        <div className="flex-col items-center space-y-2">
          <div className="text-text-neutral-tertiary">
            {certificate.invoice?.counterParty?.taxId ?? ''}
          </div>
          <div className="text-text-neutral-primary">
            {certificate.invoice?.counterParty?.name ?? ''}
          </div>
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="row-span-full min-w-100px">
        <div className="hide-scrollbar max-h-72px overflow-y-auto text-center text-text-neutral-primary">
          {certificate.invoice?.type
            ? t(`filter_section_type:FILTER_SECTION_TYPE.${certificate.invoice?.type}`)
            : ''}
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="w-100px">
        <div className="text-center text-text-neutral-primary">
          Taxable {certificate.invoice?.taxRatio ?? 0}%
        </div>
      </BorderCell>
      {/* Info: (20240924 - tzuhan) Price Information */}
      <BorderCell isSelected={certificate.isSelected} className="w-170px">
        <div className="flex-col items-center space-y-2">
          <div className="flex justify-between">
            <div className="flex w-75px items-center gap-badge-gap-spacing-sm rounded-full bg-surface-support-soft-rose px-badge-spacing-x-sm py-badge-spacing-y-sm text-xs">
              <div
                className={`m-1 inline-block h-6px w-6px rounded-full bg-surface-support-strong-rose`}
              ></div>
              <div>Pre-Tax</div>
            </div>
            <div className="text-text-neutral-primary">
              {certificate.invoice?.priceBeforeTax ?? 0}
              <span className="ml-1 text-text-neutral-tertiary">
                {certificate.invoice?.currencyAlias ?? ''}
              </span>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="flex w-75px items-center gap-badge-gap-spacing-sm rounded-full bg-surface-support-soft-baby px-badge-spacing-x-sm py-badge-spacing-y-sm text-xs">
              <div
                className={`m-1 inline-block h-6px w-6px rounded-full bg-surface-support-strong-baby`}
              ></div>
              <div>After-Tax</div>
            </div>
            <div className="text-text-neutral-primary">
              {certificate.invoice?.totalPrice ?? 0}
              <span className="ml-1 text-text-neutral-tertiary">
                {certificate.invoice?.currencyAlias ?? ''}
              </span>
            </div>
          </div>
        </div>
      </BorderCell>
      <BorderCell isSelected={certificate.isSelected} className="w-80px">
        <div className="flex items-center justify-center">
          {certificate.invoice?.deductible ? (
            <Image src="/elements/check.svg" alt="Yes" width={20} height={20} />
          ) : (
            <div></div>
          )}
        </div>
      </BorderCell>

      {/* Info: (20240924 - tzuhan) Voucher Information */}
      <BorderCell isSelected={certificate.isSelected} className="w-120px text-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="text-right text-link-text-primary">{certificate?.voucherNo ?? ''}</div>
          <div className="flex gap-lv-1 text-right text-text-neutral-primary">
            {certificate.uploader && (
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

export default CertificateItem;
