import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiHome, FiArrowRight } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
import { Provider } from '@/constants/provider';
import { ISUNFA_ROUTE } from '@/constants/url';
import I18n from '@/components/i18n/i18n';
import useOuterClick from '@/lib/hooks/use_outer_click';
import Loader from '@/components/loader/loader';
import TermsOfServiceModal from '@/components/login/terms_of_service_modal';

export interface NewLoginPageProps {
  invitation: string;
  action: string;
}

const NewLoginPageBody = ({ invitation, action }: NewLoginPageProps) => {
  const { t } = useTranslation('dashboard');
  const { isAuthLoading, authenticateUser, isSignIn, isAgreeTermsOfService } = useUserCtx();
  const [email, setEmail] = useState<string>('');

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
    <main className="relative flex h-screen flex-col items-center justify-center text-center">
      <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>

      <section className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-40px text-button-text-secondary">
        <div ref={globalRef}>
          <I18n isMenuVisible={isMenuVisible} setIsMenuVisible={setIsMenuVisible} />
        </div>
        <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
          <FiHome size={22} />
        </Link>
      </section>

      {isAuthLoading ? (
        <Loader />
      ) : (
        <div className="z-10 flex w-480px flex-col gap-40px rounded-md bg-surface-neutral-main-background p-40px shadow-Dropshadow_XS">
          <div className="flex items-center justify-center gap-10px">
            <Image src="/logo/isunfa_logo_new_icon.svg" alt="logo" width={38.371} height={33.997} />
            <Image src="/logo/isunfa_text_logo.svg" alt="logo" width={74.769} height={18.506} />
          </div>

          <section className="flex flex-col gap-24px">
            <h1 className="text-start text-4xl font-bold leading-44px text-text-brand-secondary-lv2">
              Login
            </h1>

            <div className="flex flex-col gap-8px">
              <span className="text-start text-xl font-bold leading-8 text-text-neutral-primary">
                Email
              </span>
              <input
                type="text"
                placeholder="Enter your Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-8px self-center rounded-xs bg-button-surface-strong-primary px-24px py-10px hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable"
            >
              <span className="text-base font-medium text-button-text-primary-solid">Login</span>
              <FiArrowRight size={20} />
            </button>
          </section>

          <div className="flex flex-col gap-16px">
            <div className="flex items-center gap-24px">
              <hr className="flex-auto border-t border-stroke-neutral-mute" />
              <p>Or Login with</p>
              <hr className="flex-auto border-t border-stroke-neutral-mute" />
            </div>

            <button
              type="button"
              onClick={googleAuthSignIn}
              className="flex items-center justify-center gap-15px rounded-sm bg-white p-15px shadow-Dropshadow_SM"
            >
              <Image src="/icons/google_logo.svg" alt="google_logo" width="24" height="24"></Image>
              <p className="text-xl font-medium text-gray-500">
                {t('dashboard:LOGIN.LOG_IN_WITH_GOOGLE')}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* // Info: (20241206 - Liz) 服務條款彈窗 */}
      <TermsOfServiceModal
        isModalVisible={isTermsOfServiceModalVisible}
        closeTermsOfServiceModal={closeTermsOfServiceModal}
      />
    </main>
  );
};

export default NewLoginPageBody;
