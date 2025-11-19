import React, { useState } from 'react';
import AAASidebar from '@/components/ai_accounting_assistance/sidebar';
import InvoiceEditArea from '@/components/ai_accounting_assistance/invoice_edit_area';

interface ILayoutProps {
  children: React.ReactNode;
  className?: string;
}

const AAALayout: React.FC<ILayoutProps> = ({ children, className }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isInvoiceAreaOpen, setIsInvoiceAreaOpen] = useState<boolean>(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string>('');

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const toggleInvoiceArea = () => setIsInvoiceAreaOpen((prev) => !prev);

  const clickInvoiceHandler = (invoiceId: string) => {
    if (invoiceId === activeInvoiceId) {
      // Info: (20251119 - Julian) 關閉已開啟的發票編輯區
      setIsInvoiceAreaOpen(false);
      setActiveInvoiceId('');
    } else {
      // Info: (20251119 - Julian) 開啟發票編輯區s
      setActiveInvoiceId(invoiceId);
      setIsInvoiceAreaOpen(true);
    }
  };

  return (
    <main className="min-h-screen w-screen overflow-x-hidden bg-surface-neutral-main-background bg-aaa bg-cover bg-no-repeat">
      {/* Info: (20251014 - Julian) Left: Sidebar */}
      <AAASidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        activeInvoiceId={activeInvoiceId}
        clickInvoiceHandler={clickInvoiceHandler}
      />
      {/* Info: (20251014 - Julian) Right: Main Area */}
      <div
        className={`${isSidebarOpen ? 'ml-250px' : 'ml-70px'} ${isInvoiceAreaOpen ? 'mr-500px' : 'mr-0'} ${className} flex h-screen grow flex-col justify-center px-40px py-32px transition-all duration-200 ease-in-out`}
      >
        {children}
      </div>
      {/* Info: (20251114 - Julian) Invoice Edit Area */}
      <InvoiceEditArea
        isOpen={isInvoiceAreaOpen}
        toggle={toggleInvoiceArea}
        invoiceId={activeInvoiceId}
      />
    </main>
  );
};

export default AAALayout;
