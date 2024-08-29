import React, { useEffect } from 'react';
import Image from 'next/image';
import { useGlobalCtx } from '@/contexts/global_context';
import AvatarSVG from '@/components/avater_svg/avater_svg';
import { ILoginPageProps } from '@/interfaces/page_props';
import { Provider } from '@/constants/provider';
import { useUserCtx } from '@/contexts/user_context';
import { ToastType } from '@/interfaces/toastify';
import { useTranslation } from 'next-i18next';

const getProviderDetails = (provider: Provider) => {
  return {
    logo: provider === Provider.GOOGLE ? '/icons/google_logo.svg' : '/icons/apple_logo.svg',
    bgColor: provider === Provider.GOOGLE ? 'bg-white' : 'bg-black',
    textColor: provider === Provider.GOOGLE ? 'text-black' : 'text-white',
  };
};

const AuthButton = React.memo(
  ({
    onClick,
    provider,
    disabled = false,
  }: {
    onClick: () => void;
    provider: Provider;
    disabled?: boolean;
  }) => {
     const { t } = useTranslation([
       'common',
       'project',
       'journal',
       'kyc',
       'report_401',
       'salary',
       'setting',
       'terms',
     ]);
    const { logo, bgColor, textColor } = getProviderDetails(provider);

    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex w-72 items-center justify-center space-x-2 rounded-sm ${bgColor} py-3 shadow-md`}
        disabled={disabled}
      >
        <Image src={logo} alt={provider} width={16} height={16} className="h-6 w-6" />
        <span className={`font-semibold ${textColor}`}>
          {t('common:LOGIN_PAGE_BODY.LOGIN_WITH_PROVIDER', {
            provider: provider.replace(provider[0], provider[0].toUpperCase()),
          })}
        </span>
      </button>
    );
  }
);

const Loader = React.memo(() => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-400 border-t-transparent"></div>
    </div>
  );
});

const LoginPageBody = ({ invitation, action }: ILoginPageProps) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const { toastHandler } = useGlobalCtx();
  const { isAuthLoading, authenticateUser, userAgreeResponse } = useUserCtx();

  useEffect(() => {
    if (userAgreeResponse) {
      if (!userAgreeResponse.success) {
        toastHandler({
          id: `user-agree-error`,
          type: ToastType.ERROR,
          content: `${t('common:COMMON.ERROR')}: ${userAgreeResponse.code}`,
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
      {isAuthLoading ? (
        <Loader />
      ) : (
        <div className="z-10 mb-8 flex flex-col items-center">
          <h1 className="mb-6 text-4xl font-bold text-gray-800">
            {t('common:LOGIN_PAGE_BODY.LOG_IN')}
          </h1>
          <div className="mx-2.5 mb-6 flex flex-col justify-center rounded-full">
            <AvatarSVG size="large" />
          </div>
          <div className="flex flex-col space-y-4">
            <AuthButton onClick={googleAuthSignIn} provider={Provider.GOOGLE} />
            {/* Info: (20240819-Tzuhan) [Beta] Apple login is not supported in the beta version
            <AuthButton onClick={appleAuthSignIn} provider="Apple" /> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPageBody;
