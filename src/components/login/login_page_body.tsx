import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IoLogoApple } from 'react-icons/io5';
import AvatarSVG from '@/components/avatar_svg/avatar_svg';
import { ILoginPageProps } from '@/interfaces/page_props';
import { Provider } from '@/constants/provider';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import { FiHome } from 'react-icons/fi';
import { ISUNFA_ROUTE } from '@/constants/url';
import I18n from '@/components/i18n/i18n';
import TermsOfServiceModal from '@/components/login/terms_of_service_modal';
import Loader from '@/components/loader/loader';
import useOuterClick from '@/lib/hooks/use_outer_click';

// ToDo: (20250122 - Liz) Apple Login 功能待修復
const IS_APPLE_LOGIN_ENABLED = false;

const LoginPageBody = ({ invitation, action }: ILoginPageProps) => {
  const { t } = useTranslation('dashboard');
  const { isAuthLoading, authenticateUser, isSignIn, isAgreeTermsOfService, handleAppleSignIn } =
    useUserCtx();

  const googleAuthSignIn = () => {
    authenticateUser(Provider.GOOGLE, {
      invitation,
      action,
    });
  };

  const [isTermsOfServiceModalVisible, setIsTermsOfServiceModalVisible] = useState<boolean>(false);
  const closeTermsOfServiceModal = () => {
    setIsTermsOfServiceModalVisible(false);
  };

  useEffect(() => {
    if (!isSignIn) return;
    setIsTermsOfServiceModalVisible(!isAgreeTermsOfService);
  }, [isSignIn, isAgreeTermsOfService]);

  const {
    targetRef: globalRef,
    componentVisible: isMenuVisible,
    setComponentVisible: setIsMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center text-center">
      <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>

      <div className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-40px text-button-text-secondary">
        <div ref={globalRef}>
          <I18n isMenuVisible={isMenuVisible} setIsMenuVisible={setIsMenuVisible} />
        </div>
        <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
          <FiHome size={22} />
        </Link>
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
              <p className="text-xl font-medium text-gray-500">
                {t('dashboard:LOGIN.LOG_IN_WITH_GOOGLE')}
              </p>
            </button>

            {/* // Info: (20241001 - Liz) 登入 Apple 功能待實作 */}
            {IS_APPLE_LOGIN_ENABLED && (
              <button
                type="button"
                onClick={handleAppleSignIn}
                className="flex items-center justify-center gap-15px rounded-sm bg-black p-15px disabled:bg-button-surface-strong-disable"
              >
                <IoLogoApple size={24} color="white" />
                <p className="text-xl font-medium text-white">
                  {t('dashboard:LOGIN.LOG_IN_WITH_APPLE')}
                </p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* // Info: (20241206 - Liz) 服務條款彈窗 */}
      <TermsOfServiceModal
        isModalVisible={isTermsOfServiceModalVisible}
        closeTermsOfServiceModal={closeTermsOfServiceModal}
      />
    </div>
  );

  // <AuthButton onClick={googleAuthSignIn} provider={Provider.GOOGLE} />
  // {/* Info: (20240819-Tzuhan) [Beta] Apple login is not supported in the beta version
  // <AuthButton onClick={appleAuthSignIn} provider="Apple" /> */}
};

export default LoginPageBody;
