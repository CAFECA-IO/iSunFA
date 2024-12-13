import Search from '@/components/beta/layout/search';
import ModeSwitch from '@/components/beta/layout/mode_switch';
import I18n from '@/components/i18n/i18n';
import Notification from '@/components/beta/layout/notification';
import Profile from '@/components/beta/layout/profile';
import CompanyBadge from '@/components/beta/layout/company_badge';
import PageTitle from '@/components/beta/layout/page_title';
import { useEffect, useRef } from 'react';
import useClickManager from '@/lib/hooks/use_click_manager';

interface HeaderProps {
  isDashboard: boolean;
  pageTitle?: string;
  goBackUrl?: string;
  notPrint?: boolean;
}

const Header = ({ isDashboard, pageTitle, goBackUrl, notPrint }: HeaderProps) => {
  const globalRef = useRef<HTMLDivElement>(null); // 定義 globalRef
  const notificationRef = useRef<HTMLDivElement>(null); // 定義 notificationRef

  const { registerRef, visibleMap, setVisibility } = useClickManager<HTMLDivElement>();

  useEffect(() => {
    // Info: (20241213 - Liz) 註冊 refs
    if (globalRef.current && notificationRef.current) {
      registerRef('menu', globalRef);
      registerRef('notification', notificationRef);
    }
  }, []);

  return (
    <header
      className={`flex items-center gap-24px px-20px pb-8px pt-32px screen1280:px-56px ${notPrint ? 'print:hidden' : ''}`}
    >
      {isDashboard ? <Search /> : <PageTitle pageTitle={pageTitle} goBackUrl={goBackUrl} />}

      <section className="flex flex-none items-center gap-16px">
        <ModeSwitch />

        <div ref={globalRef}>
          <I18n
            isMenuVisible={visibleMap.menu}
            setIsMenuVisible={(visible) => setVisibility('menu', visible)}
          />
        </div>

        <div ref={notificationRef}>
          <Notification
            isPanelOpen={visibleMap.notification}
            setIsPanelOpen={(visible) => setVisibility('notification', visible)}
          />
        </div>
        <CompanyBadge />

        <Profile />
      </section>
    </header>
  );
};

export default Header;
