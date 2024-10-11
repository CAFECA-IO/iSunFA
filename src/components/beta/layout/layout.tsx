import { ReactNode } from 'react';
import { FiLayout } from 'react-icons/fi';
import Header from '@/components/beta/layout/header';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen border-2 border-rose-400">
      {/* side menu */}
      <section className="w-280px flex-none border-2 border-sky-400">
        <FiLayout size={24} />
        <div>Parameter Setting</div>
      </section>

      <div className="flex flex-auto flex-col gap-40px border-2 border-lime-400 bg-surface-neutral-main-background px-56px py-32px">
        <Header />

        {/* Content */}
        <main>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
