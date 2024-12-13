import Search from '@/components/beta/layout/search';
import ModeSwitch from '@/components/beta/layout/mode_switch';
import I18n from '@/components/i18n/i18n';
import Notification from '@/components/beta/layout/notification';
import Profile from '@/components/beta/layout/profile';
import CompanyBadge from '@/components/beta/layout/company_badge';
import PageTitle from '@/components/beta/layout/page_title';
import useOuterClick from '@/lib/hooks/use_outer_click';

interface HeaderProps {
  isDashboard: boolean;
  pageTitle?: string;
  goBackUrl?: string;
  notPrint?: boolean;
}

const Header = ({ isDashboard, pageTitle, goBackUrl, notPrint }: HeaderProps) => {
  const {
    targetRef: globalRef,
    componentVisible: isMenuVisible,
    setComponentVisible: setIsMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: notificationRef,
    componentVisible: isPanelOpen,
    setComponentVisible: setIsPanelOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241213 - Liz) 點擊 I18n 按鈕可以開關 I18n 選單，並且預設會先關閉通知選單。(會這樣設計是因為 useOuterClick 的 ref 會互相干擾)
  const toggleI18nMenu = () => {
    setIsPanelOpen(false);
    setIsMenuVisible((prev) => !prev);
  };

  // Info: (20241213 - Liz) 點擊通知按鈕可以開關通知選單，並且預設會先關閉 I18n 選單。
  const toggleNotificationPanel = () => {
    setIsMenuVisible(false);
    setIsPanelOpen((prev) => !prev);
  };

  return (
    <header
      className={`flex items-center gap-24px px-20px pb-8px pt-32px screen1280:px-56px ${notPrint ? 'print:hidden' : ''}`}
    >
      {isDashboard ? <Search /> : <PageTitle pageTitle={pageTitle} goBackUrl={goBackUrl} />}

      <section className="flex flex-none items-center gap-16px">
        <ModeSwitch />

        <div ref={globalRef}>
          <I18n
            isMenuVisible={isMenuVisible}
            setIsMenuVisible={setIsMenuVisible}
            toggleI18nMenu={toggleI18nMenu}
          />
        </div>

        <div ref={notificationRef}>
          <Notification
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={setIsPanelOpen}
            toggleNotificationPanel={toggleNotificationPanel}
          />
        </div>

        <CompanyBadge />

        <Profile />
      </section>
    </header>
  );
};

export default Header;
