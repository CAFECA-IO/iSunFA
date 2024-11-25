import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AvatarSVG from '@/components/avatar_svg/avatar_svg';
import { ILoginPageProps } from '@/interfaces/page_props';
import { Provider } from '@/constants/provider';
import { useUserCtx } from '@/contexts/user_context';
import { useTranslation } from 'next-i18next';
import { FiHome } from 'react-icons/fi';
import I18n from '@/components/i18n/i18n';
import LoginConfirmModal from '@/components/login_confirm_modal/login_confirm_modal';
import { ISUNFA_ROUTE } from '@/constants/url';

// ToDo: (20241119 - Liz) Beta version 不支援 Apple 登入
const IS_APPLE_LOGIN_ENABLED = true;

const Loader = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-400 border-t-transparent"></div>
    </div>
  );
};

const LoginPageBody = ({ invitation, action }: ILoginPageProps) => {
  const { t } = useTranslation('dashboard');
  const { isAuthLoading, authenticateUser, isSignIn, isAgreeTermsOfService, isAgreePrivacyPolicy } =
    useUserCtx();

  const googleAuthSignIn = () => {
    authenticateUser(Provider.GOOGLE, {
      invitation,
      action,
    });
  };

  const appleAuthSignIn = () => {
    authenticateUser(Provider.APPLE, {
      invitation,
      action,
    });
  };

  const [isTermsOfServiceConfirmModalVisible, setIsTermsOfServiceConfirmModalVisible] =
    useState<boolean>(false);

  const [isPrivacyPolicyConfirmModalVisible, setIsPrivacyPolicyConfirmModalVisible] =
    useState<boolean>(false);

  const toggleTermsOfServiceConfirmModal = (visibility: boolean) => {
    setIsTermsOfServiceConfirmModalVisible(visibility);
  };

  const togglePrivacyPolicyConfirmModal = (visibility: boolean) => {
    setIsPrivacyPolicyConfirmModalVisible(visibility);
  };

  useEffect(() => {
    if (!isSignIn) return;

    setIsTermsOfServiceConfirmModalVisible(!isAgreeTermsOfService);
    setIsPrivacyPolicyConfirmModalVisible(isAgreeTermsOfService && !isAgreePrivacyPolicy);
  }, [isSignIn, isAgreeTermsOfService, isAgreePrivacyPolicy]);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center text-center">
      <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>

      <div className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-40px text-button-text-secondary">
        <I18n />
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
                onClick={appleAuthSignIn}
                className="flex items-center justify-center gap-15px rounded-sm bg-black p-15px"
                disabled={!IS_APPLE_LOGIN_ENABLED}
              >
                <Image src="/icons/apple_logo.svg" alt="apple_logo" width="24" height="24"></Image>
                <p className="text-xl font-medium text-white">
                  {t('dashboard:LOGIN.LOG_IN_WITH_APPLE')}
                </p>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <LoginConfirmModal
        id="terms-of-service"
        isModalVisible={isTermsOfServiceConfirmModalVisible}
        modalData={{
          title: t('terms:MODAL.PLEASE_READ_AND_AGREE_THE_FIRST_TIME_YOU_LOGIN'),
          content: 'terms_of_service',
          buttonText: t('terms:MODAL.AGREE_TO_OUR_TERMS_OF_SERVICE'),
        }}
        toggleTermsOfServiceConfirmModal={toggleTermsOfServiceConfirmModal}
        togglePrivacyPolicyConfirmModal={togglePrivacyPolicyConfirmModal}
      />
      <LoginConfirmModal
        id="privacy-policy"
        isModalVisible={isPrivacyPolicyConfirmModalVisible}
        modalData={{
          title: t('terms:MODAL.PLEASE_READ_AND_AGREE_THE_FIRST_TIME_YOU_LOGIN'),
          content: 'privacy_policy',
          buttonText: t('terms:MODAL.AGREE_TO_OUR_PRIVACY_POLICY'),
        }}
        toggleTermsOfServiceConfirmModal={toggleTermsOfServiceConfirmModal}
        togglePrivacyPolicyConfirmModal={togglePrivacyPolicyConfirmModal}
      />
    </div>
  );

  // <AuthButton onClick={googleAuthSignIn} provider={Provider.GOOGLE} />
  // {/* Info: (20240819-Tzuhan) [Beta] Apple login is not supported in the beta version
  // <AuthButton onClick={appleAuthSignIn} provider="Apple" /> */}
};

export default LoginPageBody;
