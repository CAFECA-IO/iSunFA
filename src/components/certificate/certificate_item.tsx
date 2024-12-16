import React, { ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
import { ICertificateUI } from '@/interfaces/certificate';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { HiCheck } from 'react-icons/hi';
import Image from 'next/image';
import { IoWarningOutline } from 'react-icons/io5';

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
const simplifyFileName = (name: string, maxWidth: number = 120): string => {
  const getCharWidth = (char: string) => (/[\u4e00-\u9fa5]/.test(char) ? 2 : 1); // Info: (20241213 - tzuhan) 中文占2個單位寬
  const calculateWidth = (str: string) =>
    str.split('').reduce((acc, char) => acc + getCharWidth(char), 0);

  if (calculateWidth(name) <= maxWidth) return name;

  const extensionIndex = name.lastIndexOf('.');
  const extension = extensionIndex !== -1 ? name.slice(extensionIndex) : '';
  const baseName = extensionIndex !== -1 ? name.slice(0, extensionIndex) : name;

  const ellipsisWidth = 3; // Info: (20241213 - tzuhan) "..." 寬度
  const maxBaseWidth = maxWidth - ellipsisWidth - calculateWidth(extension);

  let currentWidth = 0;
  let start = '';
  let end = '';

  // Info: (20241213 - tzuhan) 從頭開始裁剪前半部分
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < baseName.length; i++) {
    const charWidth = getCharWidth(baseName[i]);
    if (currentWidth + charWidth > maxBaseWidth / 2) break;
    start += baseName[i];
    currentWidth += charWidth;
  }

  currentWidth = 0;

  // Info: (20241213 - tzuhan) 從尾開始裁剪後半部分
  // eslint-disable-next-line no-plusplus
  for (let i = baseName.length - 1; i >= 0; i--) {
    const charWidth = getCharWidth(baseName[i]);
    if (currentWidth + charWidth > maxBaseWidth / 2) break;
    end = baseName[i] + end;
    currentWidth += charWidth;
  }

  return `${start}...${end}${extension}`;
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
            <IoWarningOutline size={16} className="text-surface-state-error" />
          )}
          <div className="flex-col">
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
      <BorderCell isSelected={certificate.isSelected} className="w-120px">
        <div className="flex items-center space-y-2">
          <div className="text-right text-link-text-primary">{certificate?.voucherNo ?? ''}</div>
          <div className="text-right text-text-neutral-primary">
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
