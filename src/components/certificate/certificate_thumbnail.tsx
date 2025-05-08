import Image from 'next/image';
import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
// import { ICertificateUI } from '@/interfaces/certificate';
import { CERTIFICATE_USER_INTERACT_OPERATION } from '@/constants/certificate';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { HiCheck } from 'react-icons/hi';
import { timestampToString } from '@/lib/utils/common';
import { ICertificateRC2InputUI } from '@/interfaces/certificate_rc2';

interface CertificateThumbnailProps {
  data: ICertificateRC2InputUI;
  activeSelection: boolean;
  handleSelect: (ids: number[], isSelected: boolean) => void;
  onRemove: (id: number) => void;
  onDownload: (id: number) => void;
  onEdit: (id: number) => void;
}

const CertificateThumbnail: React.FC<CertificateThumbnailProps> = ({
  data,
  activeSelection,
  handleSelect,
  onRemove,
  onDownload,
  onEdit,
}) => {
  const { t } = useTranslation(['common', 'certificate']);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div
      key={data.id}
      className={`relative h-200px w-200px rounded-md border ${data.isSelected ? 'border-stroke-brand-primary bg-surface-brand-primary-30' : 'border-stroke-neutral-quaternary'} hover:border-stroke-brand-primary hover:bg-surface-brand-primary-30`}
    >
      <div
        className="my-3 flex flex-col items-center"
        onClick={() => {
          return activeSelection ? handleSelect([data.id], !data.isSelected) : onEdit(data.id);
        }}
      >
        <div className="flex max-h-134px min-h-134px max-w-90px items-center overflow-hidden">
          {/* Info: (20240924 - Tzuhan) 縮略圖 */}
          <Image
            // src={data.file.url}
            src={data.file?.url ?? ''}
            alt={`Certificate`}
            height={136}
            width={93}
            className="w-full object-cover"
          />
        </div>

        {/* Info: (20240924 - Tzuhan) 發票號碼和日期 */}
        <div className="mt-2 text-center">
          <div className="text-sm font-medium">{data.no}</div>
          <div className="mt-1 text-xs text-text-neutral-tertiary">
            {data.issuedDate ? timestampToString(data.issuedDate).date : data.issuedDate}
          </div>
        </div>
      </div>

      {/* Info: (20241030 - Tzuhan) incomplete */}
      {data.incomplete && !activeSelection && (
        <div className="absolute left-1.5 top-1.5 z-10 flex items-center justify-center rounded-xs bg-badge-surface-soft-primary px-2.5 py-1 text-xs text-badge-text-primary-solid">
          {t('certificate:LABEL.NEW')}
        </div>
      )}

      {/* Info: (20240924 - Tzuhan) 資料不完整 */}
      {data.incomplete && (
        <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center justify-center rounded-xs text-xs text-surface-state-error">
          <Image src="/icons/hint.svg" alt="Hint" width={16} height={16} className="min-w-16px" />
        </div>
      )}

      {/* Info: (20240924 - Tzuhan) 選擇框 */}
      {activeSelection && (
        <div
          className={`absolute left-3 top-3 h-16px w-16px rounded border border-checkbox-stroke-unselected ${data.isSelected ? 'bg-checkbox-surface-selected' : 'bg-checkbox-surface-unselected'}`}
          onClick={() => handleSelect([data.id], !data.isSelected)}
        >
          {data.isSelected && (
            <HiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-neutral-white" />
          )}
        </div>
      )}
      {/* Info: (20240924 - Tzuhan) 操作按鈕 */}
      <div
        className="absolute right-0 top-0 h-36px w-36px text-stroke-brand-secondary-moderate"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <BsThreeDotsVertical className="absolute right-2 top-3" />
      </div>
      {/* Info: (20240924 - Tzuhan) 操作選單 */}
      {isMenuOpen && (
        <div className="group absolute left-20 top-2 z-10 mt-7 w-36 rounded-sm border bg-white shadow-dropmenu group-hover:pointer-events-none">
          <ul>
            {data.actions.includes(CERTIFICATE_USER_INTERACT_OPERATION.DOWNLOAD) && (
              <li
                className="pointer-events-auto flex cursor-pointer items-center rounded-t-sm p-2 px-4"
                onClick={() => onDownload(data.id)}
              >
                <span className="mr-2">
                  <Image src="/elements/download.svg" alt="⬇" width={20} height={20} />
                </span>
                {t('certificate:OPERATION.DOWNLOAD')}
              </li>
            )}
            {data.actions.includes(CERTIFICATE_USER_INTERACT_OPERATION.REMOVE) && (
              <li
                className="pointer-events-auto flex cursor-pointer items-center rounded-b-sm p-2 px-4"
                onClick={() => onRemove(data.id)}
              >
                <span className="mr-2">
                  <Image src="/elements/remove.svg" alt="🗑️" width={20} height={20} />
                </span>
                {t('certificate:OPERATION.REMOVE')}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CertificateThumbnail;
