import { ReactNode, useState } from 'react';
import Header from '@/components/beta/layout/header';
import SideMenu from '@/components/beta/layout/side_menu';

interface LayoutProps {
  children: ReactNode;
  isDashboard: boolean;
  pageTitle?: string;
  goBackUrl?: string;
}

const Layout = ({ children, isDashboard, pageTitle, goBackUrl }: LayoutProps) => {
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  const toggleOverlay = () => {
    setIsOverlayVisible((prev) => !prev);
  };

  return (
    <div className="flex h-screen">
      <SideMenu toggleOverlay={toggleOverlay} />

      <div className="relative flex flex-auto flex-col bg-surface-neutral-main-background">
        <Header isDashboard={isDashboard} pageTitle={pageTitle} goBackUrl={goBackUrl} />

        {/* // Info: (20241018 - Liz) Overlay with backdrop-blur */}
        {isOverlayVisible && <div className="absolute inset-0 z-10 backdrop-blur-sm"></div>}

        {/* // Info: (20241018 - Liz) Content Body */}
        <main className="h-full overflow-y-auto px-20px py-32px screen1280:px-56px">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
