import { cn } from '@/lib/utils/common';
import Search from '@/components/beta/layout/search';
import ModeSwitch from '@/components/beta/layout/mode_switch';
import I18n from '@/components/i18n/i18n';
import Notification from '@/components/beta/layout/notification';
import Profile from '@/components/beta/layout/profile';
import AccountBookBadge from '@/components/beta/layout/account_book_badge';
import PageTitle from '@/components/beta/layout/page_title';
import useOuterClick from '@/lib/hooks/use_outer_click';
import HeaderMobile from '@/components/beta/layout/mobile/header_mobile';

// ToDo: (20241226 - Liz) Beta 版沒有切換明暗模式功能
const IS_MODE_SWITCH_AVAILABLE = false;

interface HeaderProps {
  isDashboard: boolean;
  pageTitle?: string;
  goBackUrl?: string;
  notPrint?: boolean;
  toggleOverlay: () => void;
}

const Header = ({ isDashboard, pageTitle, goBackUrl, notPrint, toggleOverlay }: HeaderProps) => {
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
    <>
      {/* Info: (20250512 - Liz) Desktop version (include: tablet/laptop/desktop) */}
      <header
        className={cn(
          'hidden items-center gap-24px px-lv-7 pt-lv-6 tablet:flex screen1280:px-56px',
          {
            'print:hidden': notPrint,
          }
        )}
      >
        <section className="min-w-0 flex-auto">
          {isDashboard ? (
            <Search toggleOverlay={toggleOverlay} />
          ) : (
            <PageTitle pageTitle={pageTitle} goBackUrl={goBackUrl} />
          )}
        </section>

        <section className="ml-auto flex flex-none items-center gap-16px">
          {IS_MODE_SWITCH_AVAILABLE && <ModeSwitch />}

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

          <AccountBookBadge />

          <Profile />
        </section>
      </header>

      {/* Info: (20250512 - Liz) Mobile version */}
      <HeaderMobile />
    </>
  );
};

export default Header;
