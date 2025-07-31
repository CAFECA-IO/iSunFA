import React, { useState } from 'react';
import Image from 'next/image';
import { IInvoiceRC2UI } from '@/interfaces/invoice_rc2';
import InvoicePreviewModal from '@/components/voucher/invoice_preview_modal';
import { simplifyFileName } from '@/lib/utils/common';

interface InvoiceSelectorThumbnailProps {
  invoice: IInvoiceRC2UI;
  isSelected: boolean;
  isSelectable: boolean;
  isDeletable: boolean;
  handleSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  isOnTopOfModal?: boolean;
}

const InvoiceSelectorThumbnail: React.FC<InvoiceSelectorThumbnailProps> = ({
  invoice,
  handleSelect,
  isSelected,
  isDeletable,
  isSelectable,
  onDelete,
  isOnTopOfModal = false,
}) => {
  const [selectedInvoice, setSelectedInvoice] = useState<IInvoiceRC2UI | null>(null);

  const handleClicked = (e: React.MouseEvent<HTMLDivElement>, clickedInvoice: IInvoiceRC2UI) => {
    e.stopPropagation();
    if (selectedInvoice?.id !== invoice.id) {
      setSelectedInvoice(clickedInvoice);
    } else {
      setSelectedInvoice(null);
    }
  };
  return (
    <>
      <InvoicePreviewModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        isOnTopOfModal={isOnTopOfModal}
      />
      <div
        key={invoice.id}
        className={`flex flex-col items-center gap-2 rounded-sm border px-4 py-3 ${isSelected || !isSelectable ? (isSelectable ? 'border-stroke-brand-primary bg-surface-brand-primary-30' : 'hover:group border-transparent hover:cursor-pointer') : 'border-transparent'}`}
        onClick={handleSelect ? () => handleSelect(invoice.id) : () => {}}
      >
        <div
          className={`relative flex h-136px w-85px items-center ${!isSelected || !isSelectable ? 'group' : ''}`}
        >
          <div className="flex h-136px w-85px items-center justify-center overflow-hidden">
            <Image
              src={invoice.file.thumbnail?.url || invoice.file.url}
              alt="invoice"
              width={85}
              height={136}
            />
          </div>
          <div className="absolute left-0 top-0 z-10 hidden h-full w-full bg-black/50 group-hover:block">
            {isDeletable && onDelete && (
              <div
                className="absolute -right-5px top-0 -translate-y-1/2 cursor-pointer rounded-full border border-stroke-neutral-quaternary bg-white p-1 hover:bg-gray-300"
                onClick={() => onDelete(invoice.id)}
              >
                <Image src="/elements/x-close.svg" alt="close" width={10} height={10} />
              </div>
            )}
            {/* Info: (20250207 - Julian) 右下角的放大鏡按鈕 */}
            <div
              className={`absolute bottom-0 right-0 cursor-pointer rounded-xs bg-white/50 text-white hover:bg-white ${isSelectable ? 'block' : 'hidden'}`}
              onClick={(e) => handleClicked(e, invoice)}
            >
              <div className="p-2 hover:invert">
                <Image src="/elements/search.svg" alt="search" width={20} height={20} />
              </div>
            </div>
            {/* Info: (20250207 - Julian) 正中央的放大鏡按鈕 */}
            <div
              onClick={(e) => handleClicked(e, invoice)}
              className={`absolute bottom-0 right-0 ${isSelectable ? 'hidden' : 'flex'} h-full w-full flex-col items-center justify-center p-16px`}
            >
              <Image src="/elements/search.svg" alt="search" width={24} height={24} />
            </div>
          </div>
        </div>
        <div className="text-xs font-medium text-text-neutral-primary">
          {simplifyFileName(invoice.file.name)}
        </div>
      </div>
    </>
  );
};

export default InvoiceSelectorThumbnail;
