import { ICertificateUI, OPERATIONS } from '@/interfaces/certificate';
import Image from 'next/image';
import React, { useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { HiCheck } from 'react-icons/hi';

interface CertificateThumbnailProps {
  data: ICertificateUI;
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div
      key={data.id}
      className={`relative h-200px w-200px rounded-md border ${data.isSelected ? 'border-stroke-brand-primary bg-surface-brand-primary-30' : 'border-stroke-neutral-quaternary'} hover:border-stroke-brand-primary hover:bg-surface-brand-primary-30`}
    >
      <div
        className="my-3"
        onClick={
          activeSelection
            ? handleSelect.bind(null, [data.id], !data.isSelected)
            : onEdit.bind(null, data.id)
        }
      >
        {/* Info: (20240924 - Tzuhan) 縮略圖 */}
        <Image
          src={data.thumbnailUrl}
          alt={`Certificate ${data.invoiceName}`}
          height={136}
          width={93}
          className="mx-auto h-134px w-90px overflow-hidden object-cover"
        />

        {/* Info: (20240924 - Tzuhan) 發票號碼和日期 */}
        <div className="mt-2 text-center">
          <div className="text-sm font-medium">{data.invoiceNumber}</div>
          <div className="mt-1 text-xs text-gray-500">{data.date}</div>
        </div>
      </div>

      {/* Info: (20240924 - Tzuhan) 選擇框 */}
      {activeSelection && (
        <div
          className={`absolute left-3 top-3 h-16px w-16px rounded border border-checkbox-stroke-unselected ${data.isSelected ? 'bg-checkbox-surface-selected' : 'bg-checkbox-surface-unselected'}`}
          onClick={handleSelect.bind(null, [data.id], !data.isSelected)}
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
        onMouseEnter={() => setIsMenuOpen(true)}
        onMouseLeave={() => setIsMenuOpen(false)}
      >
        <BsThreeDotsVertical className="absolute right-2 top-3" />
      </div>
      {/* Info: (20240924 - Tzuhan) 操作選單 */}
      {isMenuOpen && (
        <div
          className="group absolute left-20 top-2 z-10 mt-7 w-36 rounded-sm border bg-white shadow-dropmenu group-hover:pointer-events-none"
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          <ul>
            {data.actions.includes(OPERATIONS.DOWNLOAD) && (
              <li
                className="pointer-events-auto flex cursor-pointer items-center rounded-t-sm p-2 px-4"
                onClick={onDownload.bind(null, data.id)}
              >
                <span className="mr-2">
                  <Image src="/elements/download.svg" alt="⬇" width={20} height={20} />
                </span>
                Download
              </li>
            )}
            {data.actions.includes(OPERATIONS.REMOVE) && (
              <li
                className="pointer-events-auto flex cursor-pointer items-center rounded-b-sm p-2 px-4"
                onClick={onRemove.bind(null, data.id)}
              >
                <span className="mr-2">
                  <Image src="/elements/remove.svg" alt="🗑️" width={20} height={20} />
                </span>
                Remove
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CertificateThumbnail;
