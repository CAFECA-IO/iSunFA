import InvoiceSelectorThumbnail from '@/components/voucher/invoice_selector_thumbnail';
import { FaPlus } from 'react-icons/fa6';
import { useEffect, useState } from 'react';
import { IInvoiceRC2UI } from '@/interfaces/invoice_rc2';

interface InvoiceSelectionPanelProps {
  invoices: IInvoiceRC2UI[];
  selectedIds: number[];
  handleSelect: (id: number) => void;
  openUploaderModal: () => void;
}

const InvoiceSelectionPanel: React.FC<InvoiceSelectionPanelProps> = ({
  invoices,
  selectedIds,
  handleSelect,
  openUploaderModal,
}: InvoiceSelectionPanelProps) => {
  const [invoicesReOrdered, setInvoicesReOrdered] = useState<IInvoiceRC2UI[]>(invoices);

  useEffect(() => {
    const incompleteInvoices: IInvoiceRC2UI[] = [];
    const readInvoices: IInvoiceRC2UI[] = [];
    invoices.forEach((invoice) => {
      if (invoice.incomplete) {
        incompleteInvoices.push(invoice);
      } else {
        readInvoices.push(invoice);
      }
    });
    setInvoicesReOrdered([...incompleteInvoices, ...readInvoices]);
  }, [invoices]);

  return (
    <div className="my-4 h-392px bg-surface-neutral-main-background py-lv-2 tablet:rounded-lg tablet:px-8 tablet:py-4">
      <div className="h-full overflow-y-auto">
        <div className="grid grid-cols-2 place-items-center justify-start tablet:grid-cols-5 tablet:gap-2">
          <div className="group h-182px py-2">
            <button
              type="button"
              className="flex h-136px w-85px items-center justify-center rounded-xs border border-dashed border-stroke-neutral-tertiary p-2 text-white group-hover:border-stroke-brand-primary"
              onClick={openUploaderModal}
            >
              <FaPlus
                className="text-stroke-neutral-tertiary group-hover:text-stroke-brand-primary"
                size={24}
              />
            </button>
          </div>
          {invoicesReOrdered.map((invoice) => (
            <InvoiceSelectorThumbnail
              key={invoice.id}
              isSelected={selectedIds.includes(invoice.id)}
              invoice={invoice}
              handleSelect={handleSelect}
              isDeletable={false}
              isSelectable
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvoiceSelectionPanel;
