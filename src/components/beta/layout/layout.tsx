import { ReactNode, useState } from 'react';
import Header from '@/components/beta/layout/header';
import SideMenu from '@/components/beta/layout/side_menu';
// import { useModalContext } from '@/contexts/modal_context';
// import { ToastId } from '@/constants/toast_id';
// import { ToastType } from '@/interfaces/toastify';
// import { useUserCtx } from '@/contexts/user_context';
// import { useTranslation } from 'react-i18next';

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

  /** ToDo: (20241114 - tzuhan) IUser 目前沒有提供deletedAt
  const { t } = useTranslation(['setting', 'common']);
  const { toastHandler } = useModalContext();
  const { userAuth } = useUserCtx();
  useEffect(() => {
    if (userAuth?.deletedAt) {
      toastHandler({
        id: ToastId.USER_DELETE_WARNING,
        type: ToastType.WARNING,
        content: t('setting:USER.DELETE_WARNING'),
        closeable: true,
      });
    }
  }, [userAuth?.deletedAt]);
*/

  return (
    <div className="flex h-screen overflow-hidden">
      <SideMenu toggleOverlay={toggleOverlay} />

      <div className="relative flex flex-auto flex-col bg-surface-neutral-main-background">
        <Header isDashboard={isDashboard} pageTitle={pageTitle} goBackUrl={goBackUrl} />

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
