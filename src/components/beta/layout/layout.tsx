import { ReactNode } from 'react';
import Header from '@/components/beta/layout/header';
import SideMenu from '@/components/beta/layout/side_menu';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen">
      <SideMenu />

      <div className="flex flex-auto flex-col gap-40px bg-surface-neutral-main-background px-56px py-32px">
        <Header />

        {/* Content */}
        <main>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
