import { ReactNode, useEffect, useState } from 'react';
import Header from '@/components/beta/layout/header';
import SideMenu from '@/components/beta/layout/side_menu';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import loggerFront from '@/lib/utils/logger_front';

interface LayoutProps {
  children: ReactNode;
  isDashboard: boolean;
  pageTitle?: string;
  goBackUrl?: string;
}

const Layout = ({ children, isDashboard, pageTitle, goBackUrl }: LayoutProps) => {
  const { t } = useTranslation(['layout']);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  const toggleOverlay = () => {
    setIsOverlayVisible((prev) => !prev);
  };

  const { toastHandler } = useModalContext();
  const { userAuth } = useUserCtx();

  const calculateRemainDays = (deletedAt: number) => {
    const now = new Date().getTime();
    const days = 3 - Math.floor((now - deletedAt * 1000) / 24 / 60 / 60 / 1000);
    return days;
  };

  useEffect(() => {
    if (!userAuth?.deletedAt) return;
    loggerFront.log('useEffect for warning deleted user in Layout is called!');

    toastHandler({
      id: ToastId.USER_DELETE_WARNING,
      type: ToastType.WARNING,
      content: (
        <div className="flex justify-between">
          <div className="flex flex-col items-start gap-2">
            <p className="text-text-state-error">
              {t('layout:USER.DELETE_WARNING', {
                days: calculateRemainDays(userAuth?.deletedAt),
              })}
            </p>
            <p>{t('layout:USER.DELETE_HINT')}</p>
          </div>
          <Link
            href={ISUNFA_ROUTE.GENERAL_SETTINGS}
            className="text-sm font-bold text-link-text-warning"
          >
            {t('layout:USER.SETTINGS')}
          </Link>
        </div>
      ),
      closeable: true,
    });
  }, [t, toastHandler, userAuth]);

  return (
    <>
      {/* Info: (20250512 - Liz) Desktop version (include: tablet/laptop/desktop) */}
      <div className="hidden h-screen overflow-y-hidden tablet:flex">
        <SideMenu toggleOverlay={toggleOverlay} notPrint />

        <div className="relative flex min-w-0 flex-auto flex-col bg-surface-neutral-main-background">
          <Header
            isDashboard={isDashboard}
            pageTitle={pageTitle}
            goBackUrl={goBackUrl}
            notPrint
            toggleOverlay={toggleOverlay}
          />
          {/* Info: (20241018 - Liz) Overlay with backdrop-blur */}
          {isOverlayVisible && <div className="absolute inset-0 z-10 backdrop-blur-sm"></div>}

          {/* Info: (20241018 - Liz) Content Body */}
          <main className="hide-scrollbar h-full overflow-y-auto overflow-x-hidden p-lv-7 screen1280:px-56px">
            {children}
          </main>
        </div>
      </div>

      {/* Info: (20250512 - Liz) Mobile version */}
      <div className="flex h-screen overflow-y-hidden tablet:hidden">
        <div className="relative flex min-w-0 flex-auto flex-col bg-surface-neutral-main-background">
          <Header
            isDashboard={isDashboard}
            pageTitle={pageTitle}
            goBackUrl={goBackUrl}
            notPrint
            toggleOverlay={toggleOverlay}
          />
          {/* Info: (20241018 - Liz) Overlay with backdrop-blur */}
          {isOverlayVisible && <div className="absolute inset-0 z-10 backdrop-blur-sm"></div>}

          {/* Info: (20241018 - Liz) Content Body */}
          <main className="hide-scrollbar h-full overflow-y-auto overflow-x-hidden px-lv-4 py-lv-5">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;
