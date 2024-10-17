import { ReactNode } from 'react';
import Header from '@/components/beta/layout/header';
import SideMenu from '@/components/beta/layout/side_menu';

interface LayoutProps {
  children: ReactNode;
  isDashboard: boolean;
  pageTitle?: string;
  goBackUrl?: string;
}

const Layout = ({ children, isDashboard, pageTitle, goBackUrl }: LayoutProps) => {
  return (
    <div className="flex max-h-full min-h-screen">
      <SideMenu />

      <div className="flex flex-auto flex-col gap-40px bg-surface-neutral-main-background px-56px py-32px">
        <Header isDashboard={isDashboard} pageTitle={pageTitle} goBackUrl={goBackUrl} />

        {/* Content */}
        <main>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
