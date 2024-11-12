import React, { useEffect } from 'react';
import Image from 'next/image';
import { useModalContext } from '@/contexts/modal_context';
import AvatarSVG from '@/components/avatar_svg/avatar_svg';
import { ILoginPageProps } from '@/interfaces/page_props';
import { Provider } from '@/constants/provider';
import { useUserCtx } from '@/contexts/user_context';
import { ToastType } from '@/interfaces/toastify';
import { useTranslation } from 'next-i18next';
import { FiHome } from 'react-icons/fi';
import I18n from '@/components/i18n/i18n';
import { signIn } from 'next-auth/react';

const Loader = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-400 border-t-transparent"></div>
    </div>
  );
};

const LoginPageBody = ({ invitation, action }: ILoginPageProps) => {
  const { t } = useTranslation('dashboard');
  const { toastHandler } = useModalContext();
  const { isAuthLoading, authenticateUser, userAgreeResponse } = useUserCtx();

  useEffect(() => {
    if (userAgreeResponse) {
      if (!userAgreeResponse.success) {
        toastHandler({
          id: `user-agree-error`,
          type: ToastType.ERROR,
          content: `${t('dashboard:COMMON.ERROR')}: ${userAgreeResponse.code}`,
          closeable: true,
        });
      }
    }
  }, [userAgreeResponse]);

  const googleAuthSignIn = () => {
    authenticateUser(Provider.GOOGLE, {
      invitation,
      action,
    });
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center text-center">
      <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>

      <div className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-40px text-button-text-secondary">
        <I18n />

        <FiHome size={20} />
      </div>

      {isAuthLoading ? (
        <Loader />
      ) : (
        <div className="z-10 flex flex-col items-center">
          <div className="mb-80px flex gap-10px text-48px font-bold">
            <p className="text-text-brand-primary-lv2">iSunFA</p>
            <p className="text-text-brand-secondary-lv1">{t('dashboard:HEADER.LOGIN')}</p>
          </div>

          <div className="mb-40px flex flex-col justify-center rounded-full">
            <AvatarSVG size="large" />
          </div>

          <div className="flex w-360px flex-col gap-16px">
            <button
              type="button"
              onClick={googleAuthSignIn}
              className="flex items-center justify-center gap-15px rounded-sm bg-white p-15px"
            >
              <Image src="/icons/google_logo.svg" alt="google_logo" width="24" height="24"></Image>
              <p className="text-xl font-medium text-gray-500">Log In with Google</p>
            </button>

            {/* // Info: (20241001 - Liz) 登入 Apple 功能待實作 */}
            <button
              type="button"
              onClick={() => signIn('apple')}
              className="flex items-center justify-center gap-15px rounded-sm bg-black p-15px"
              disabled
            >
              <Image src="/icons/apple_logo.svg" alt="apple_logo" width="24" height="24"></Image>
              <p className="text-xl font-medium text-white">Log In with Apple</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // <AuthButton onClick={googleAuthSignIn} provider={Provider.GOOGLE} />
  // {/* Info: (20240819-Tzuhan) [Beta] Apple login is not supported in the beta version
  // <AuthButton onClick={appleAuthSignIn} provider="Apple" /> */}
};

export default LoginPageBody;
