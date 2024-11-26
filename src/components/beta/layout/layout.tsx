import { ReactNode, useEffect, useState } from 'react';
import Header from '@/components/beta/layout/header';
import SideMenu from '@/components/beta/layout/side_menu';
import { useModalContext } from '@/contexts/modal_context';
import { ToastId } from '@/constants/toast_id';
import { ToastType } from '@/interfaces/toastify';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';

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

    // Deprecated: (20241121 - Liz)
    // eslint-disable-next-line no-console
    console.log('useEffect for warning deleted user in Layout is called!');

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
            href={ISUNFA_ROUTE.GENERAL_SETTING}
            className="text-sm font-bold text-link-text-warning"
          >
            {t('layout:USER.SETTING')}
          </Link>
        </div>
      ),
      closeable: true,
    });
  }, [t, toastHandler, userAuth]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Info: (20241118 - Anna) 不要列印<SideMenu>  */}
      <SideMenu toggleOverlay={toggleOverlay} className="print:hidden" />

      <div className="relative flex flex-auto flex-col bg-surface-neutral-main-background">
        {/* Info: (20241118 - Anna) 不要列印<Header> */}
        <Header
          isDashboard={isDashboard}
          pageTitle={pageTitle}
          goBackUrl={goBackUrl}
          className="print:hidden"
        />
        {/* // Info: (20241018 - Liz) Overlay with backdrop-blur */}
        {isOverlayVisible && <div className="absolute inset-0 z-10 backdrop-blur-sm"></div>}
        {/* // Info: (20241018 - Liz) Content Body */}
        <main className="h-full overflow-y-auto overflow-x-hidden px-20px py-32px screen1280:px-56px">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
