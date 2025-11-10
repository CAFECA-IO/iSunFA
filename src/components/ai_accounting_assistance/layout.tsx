import React, { useState } from 'react';
import AAASidebar from '@/components/ai_accounting_assistance/sidebar';

interface ILayoutProps {
  children: React.ReactNode;
}

const AAALayout: React.FC<ILayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <main className="min-h-screen overflow-x-hidden bg-surface-neutral-main-background">
      {/* Info: (20251014 - Julian) Left: Sidebar */}
      <AAASidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Info: (20251014 - Julian) Right: Main Area */}
      <div
        className={`${isSidebarOpen ? 'ml-250px' : 'ml-70px'} flex h-screen w-full grow flex-col justify-center gap-140px bg-aaa bg-cover bg-no-repeat px-40px py-120px transition-all duration-200 ease-in-out`}
      >
        {children}
      </div>
    </main>
  );
};

export default AAALayout;
