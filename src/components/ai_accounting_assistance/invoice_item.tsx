import React from 'react';
import Image from 'next/image';
import { FiTrash2 } from 'react-icons/fi';
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
  const { id, name, unread } = invoice;
  const unfinished = true; // ToDo: (20251014 - Julian) determine if the invoice is unfinished

  const deleteInvoice = () => {
    // ToDo: (20251014 - Julian) delete invoice function
    // eslint-disable-next-line no-console
    console.log(`Delete invoice ${id}`);
  };

  return (
    <div
      onClick={clickHandler}
      className={`${
        isSelected
          ? 'border-stroke-brand-primary bg-surface-brand-primary-lv3'
          : 'border-stroke-neutral-quaternary hover:border-stroke-brand-primary hover:bg-surface-brand-primary-30'
      } flex items-center gap-8px rounded-xs border p-8px hover:cursor-pointer`}
    >
      {/* Info: (20251014 - Julian) Unread icon */}
      {unread && (
        <Image src="/icons/unread_indicator.svg" width={10} height={10} alt="unread_indicator" />
      )}
      {/* Info: (20251014 - Julian) Thumbnail */}
      <div className="relative h-48px w-48px shrink-0 rounded-xs border border-stroke-neutral-quaternary bg-surface-neutral-solid-light">
        <Image src="/images/fake_team_img.svg" fill objectFit="contain" alt="invoice_thumbnail" />
      </div>
      {/* Info: (20251014 - Julian) Id */}
      <div className="flex flex-1 items-center gap-4px">
        <p className="max-w-60px truncate text-sm font-medium text-text-neutral-primary">{name}</p>
        {unfinished && <IoWarningOutline size={16} className="shrink-0 text-icon-surface-error" />}
      </div>
      {/* Info: (20251014 - Julian) Delete */}
      <button
        type="button"
        onClick={deleteInvoice}
        className="p-8px text-icon-surface-single-color-primary"
      >
        <FiTrash2 size={20} />
      </button>
    </div>
  );
};

export default InvoiceItem;
