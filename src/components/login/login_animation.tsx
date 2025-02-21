import { useEffect, useState } from 'react';
import { FiHome } from 'react-icons/fi';
import { PiGlobe } from 'react-icons/pi';
import { useUserCtx } from '@/contexts/user_context';

const LoginAnimation = ({
  setIsAnimationShowing,
}: {
  setIsAnimationShowing: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [switchTitle, setSwitchTitle] = useState(false);
  const { username } = useUserCtx();

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

      <div className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-40px text-button-text-secondary">
        <PiGlobe size={22} />
        <FiHome size={20} />
      </div>

      {/* // Info: (20240925 - Liz) 根據 switchTitle 狀態顯示 Title */}
      {!switchTitle && (
        <div className="z-10 flex animate-fade-in-out">
          <p className="text-64px font-bold text-surface-brand-secondary">Welcome,&nbsp;</p>
          <p className="text-64px font-bold text-surface-brand-primary">{username}</p>
        </div>
      )}

      {switchTitle && (
        <div className="z-10 flex flex-col items-center gap-24px">
          <p className="animate-fade-in-1 text-64px font-bold text-surface-brand-primary">
            iSunFA World
          </p>
          <p className="animate-fade-in-2 text-xl font-bold text-stroke-neutral-mute opacity-0">
            Redirecting to the role selection page...
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginAnimation;
