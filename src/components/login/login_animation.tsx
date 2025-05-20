import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { TbHome } from 'react-icons/tb';
import Link from 'next/link';
import { useUserCtx } from '@/contexts/user_context';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { ISUNFA_ROUTE } from '@/constants/url';
import I18n from '@/components/i18n/i18n';

interface ILoginAnimationProps {
  setIsAnimationShowing: Dispatch<SetStateAction<boolean>>;
}

const LoginAnimation = ({ setIsAnimationShowing }: ILoginAnimationProps) => {
  const [switchTitle, setSwitchTitle] = useState<boolean>(false);
  const { username } = useUserCtx();

  // Info: (20250520 - Liz) I18n 語言選單的外部點擊事件
  const {
    targetRef: globalRef,
    componentVisible: isMenuVisible,
    setComponentVisible: setIsMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  useEffect(() => {
    // Info: (20240925 - Liz) 3 秒後切換 Title
    const titleTimer = setTimeout(() => {
      setSwitchTitle(true);
    }, 3000);

    // Info: (20241001 - Liz) 6 秒後關閉動畫
    const closeAnimation = setTimeout(() => {
      setIsAnimationShowing(false);
    }, 6000);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(closeAnimation);
    };
  }, [setIsAnimationShowing]);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center text-center">
      <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>

      <div className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-12px">
        <div ref={globalRef}>
          <I18n isMenuVisible={isMenuVisible} setIsMenuVisible={setIsMenuVisible} />
        </div>
        <Link
          href={ISUNFA_ROUTE.LANDING_PAGE}
          className="p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
        >
          <TbHome size={20} />
        </Link>
      </div>

      {/* Info: (20240925 - Liz) 根據 switchTitle 狀態顯示 Title */}
      {!switchTitle && (
        <>
          <div className="z-10 hidden animate-fade-in-out tablet:flex">
            <p className="text-64px font-bold text-surface-brand-secondary">Welcome,&nbsp;</p>
            <p className="text-64px font-bold text-surface-brand-primary">{username}</p>
          </div>

          <div className="z-10 flex animate-fade-in-out flex-col border-2 border-violet-400 text-center tablet:hidden">
            <p className="text-2xl font-bold text-surface-brand-secondary">Welcome</p>
            <p className="text-36px font-bold text-surface-brand-primary">{username}</p>
          </div>
        </>
      )}

      {switchTitle && (
        <div className="z-10 flex flex-col items-center gap-24px">
          <p className="animate-fade-in-1 text-36px font-bold text-surface-brand-primary tablet:text-64px">
            iSunFA World
          </p>
          <p className="animate-fade-in-2 text-sm font-bold text-stroke-neutral-mute opacity-0 tablet:text-xl">
            Redirecting to the role selection page...
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginAnimation;
