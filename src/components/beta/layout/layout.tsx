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
    <div className="flex h-screen">
      <SideMenu />

      <div className="flex flex-auto flex-col bg-surface-neutral-main-background">
        <Header isDashboard={isDashboard} pageTitle={pageTitle} goBackUrl={goBackUrl} />

        {/* Content */}
        <main className="h-full overflow-y-auto px-20px py-32px screen1280:px-56px">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
