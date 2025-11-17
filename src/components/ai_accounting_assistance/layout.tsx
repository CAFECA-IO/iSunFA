import React, { useState } from 'react';
import AAASidebar from '@/components/ai_accounting_assistance/sidebar';
import InvoiceEditArea from '@/components/ai_accounting_assistance/invoice_edit_area';
import { mockInvoiceData } from '@/interfaces/invoice_edit_area';

interface ILayoutProps {
  children: React.ReactNode;
}

const AAALayout: React.FC<ILayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isInvoiceAreaOpen, setIsInvoiceAreaOpen] = useState<boolean>(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const toggleInvoiceArea = () => setIsInvoiceAreaOpen((prev) => !prev);

  return (
    <main className="min-h-screen w-screen overflow-x-hidden bg-surface-neutral-main-background bg-aaa bg-cover bg-no-repeat">
      {/* Info: (20251014 - Julian) Left: Sidebar */}
      <AAASidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Info: (20251014 - Julian) Right: Main Area */}
      <div
        className={`${isSidebarOpen ? 'ml-250px' : 'ml-70px'} ${isInvoiceAreaOpen ? 'mr-500px' : 'mr-0'} flex h-screen grow flex-col justify-center gap-140px px-40px py-120px transition-all duration-200 ease-in-out`}
      >
        <button
          type="button"
          onClick={toggleInvoiceArea}
          className="w-fit rounded-sm bg-rose-400 p-10px"
        >
          open invoice area
        </button>
        {children}
      </div>

      {/* Info: (20251114 - Julian) Invoice Edit Area */}
      <InvoiceEditArea
        isOpen={isInvoiceAreaOpen}
        toggle={toggleInvoiceArea}
        invoiceData={mockInvoiceData} // ToDo: (20251114 - Julian) replace with real data
      />
    </main>
  );
};

export default AAALayout;
