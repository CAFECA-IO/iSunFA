import React from 'react';
import Image from 'next/image';
import { CiImageOn } from 'react-icons/ci';
import { FiTrash2 } from 'react-icons/fi';
import { RxReload } from 'react-icons/rx';
import { IoWarningOutline } from 'react-icons/io5';

// ToDo: (20251014 - Julian) During development
interface IInvoiceItem {
  id: number;
  name: string;
  thumbnail: string;
  unread: boolean;
}

interface IInvoiceItemProps {
  invoice: IInvoiceItem;
  isSelected: boolean;
  clickHandler: () => void;
}

// ToDo: (20251014 - Julian) during development
const InvoiceItem: React.FC<IInvoiceItemProps> = ({ invoice, isSelected, clickHandler }) => {
  const { id, name, unread, thumbnail } = invoice;

  // ToDo: (20251015 - Julian) mock state for UI test
  const unfinished = true;
  const isLoading = false;
  const isError = false;
  const disabled = false;

  const enableStyle = isSelected
    ? 'bg-surface-brand-primary-lv3 border-stroke-brand-primary'
    : 'border-stroke-neutral-quaternary hover:border-stroke-brand-primary hover:bg-surface-brand-primary-30 hover:cursor-pointer';

  const disabledStyle =
    'bg-surface-neutral-mute border-stroke-neutral-quaternary hover:cursor-not-allowed';

  const itemStyle = disabled ? disabledStyle : enableStyle;

  const deleteInvoice = () => {
    // Info: (20251015 - Julian) disabled 狀態下不執行任何動作
    if (disabled) return;

    // ToDo: (20251014 - Julian) delete invoice function
    // eslint-disable-next-line no-console
    console.log(`Delete invoice ${id}`);
  };

  // Info: (20251015 - Julian) =========== Loading 樣式 ===========
  const LoadingItem = (
    <div className="flex items-center gap-8px rounded-xs border border-stroke-neutral-quaternary p-8px">
      {/* Info: (20251015 - Julian) Thumbnail */}
      <div className="h-48px w-48px rounded-xs border border-stroke-neutral-quaternary bg-stroke-neutral-quaternary opacity-50"></div>
      {/* Info: (20251015 - Julian) Id */}
      <div className="flex flex-1 items-center gap-4px opacity-50">
        <p className="text-sm font-medium text-text-neutral-primary">Scanning ...</p>
      </div>
      {/* Info: (20251015 - Julian) Delete Button */}
      <Image src="/animations/yellow_loading.gif" width={24} height={24} alt="loading" />
    </div>
  );

  // Info: (20251015 - Julian) =========== Error 樣式 ===========
  const ErrorItem = (
    <div className="flex items-center gap-8px rounded-xs border border-stroke-state-error p-8px text-text-state-error">
      {/* Info: (20251015 - Julian) Thumbnail */}
      <CiImageOn size={32} />
      {/* Info: (20251015 - Julian) Id */}
      <div className="flex-1 text-xs font-medium">
        File too large.
        <br /> Need to be &#060; 30 MB.
      </div>
      {/* Info: (20251015 - Julian) Delete & Reload button */}
      <div className="flex items-center">
        <button type="button" className="p-8px">
          <FiTrash2 size={20} />
        </button>
        <button type="button" className="p-8px">
          <RxReload size={20} />
        </button>
      </div>
    </div>
  );

  const deleteBtn = disabled ? null : (
    <button
      type="button"
      onClick={deleteInvoice}
      className="p-8px text-icon-surface-single-color-primary"
    >
      <FiTrash2 size={20} />
    </button>
  );

  if (isLoading) return LoadingItem;
  if (isError) return ErrorItem;

  return (
    <div
      onClick={clickHandler}
      className={`${itemStyle} flex items-center gap-8px rounded-xs border p-8px`}
    >
      {/* Info: (20251014 - Julian) Unread icon */}
      {unread && (
        <Image src="/icons/unread_indicator.svg" width={10} height={10} alt="unread_indicator" />
      )}
      {/* Info: (20251014 - Julian) Thumbnail */}
      <div className="relative h-48px w-48px shrink-0 rounded-xs border border-stroke-neutral-quaternary">
        <Image src={thumbnail} fill objectFit="contain" alt="invoice_thumbnail" />
      </div>
      {/* Info: (20251014 - Julian) Id */}
      <div className="flex flex-1 items-center gap-4px">
        <p className="max-w-60px truncate text-sm font-medium text-text-neutral-primary">{name}</p>
        {unfinished && <IoWarningOutline size={16} className="shrink-0 text-icon-surface-error" />}
      </div>
      {/* Info: (20251014 - Julian) Delete Button */}
      {deleteBtn}
    </div>
  );
};

export default InvoiceItem;
