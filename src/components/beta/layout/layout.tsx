import { ReactNode, useState } from 'react';
import { FiLayout } from 'react-icons/fi';
import Header from '@/components/beta/layout/header';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(true);

  const ToggleSideMenu = () => {
    setIsSideMenuOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen border-2 border-rose-400">
      {/* side menu */}

      {isSideMenuOpen ? (
        <section className="w-280px flex-none border-2 border-sky-400 px-12px py-32px">
          <button type="button" className="p-10px">
            <FiLayout size={24} onClick={ToggleSideMenu} />
          </button>
          <div>Parameter Setting</div>
          <div>Parameter Setting</div>
          <div>Parameter Setting</div>
          <div>Parameter Setting</div>
          <div>Parameter Setting</div>
        </section>
      ) : (
        <section className="w-66px flex-none px-12px py-32px">
          <button type="button" className="p-10px">
            <FiLayout size={24} onClick={ToggleSideMenu} />
          </button>
        </section>
      )}

      <div className="flex flex-auto flex-col gap-40px border-2 border-lime-400 bg-surface-neutral-main-background px-56px py-32px">
        <Header />

        {/* Content */}
        <main>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
