import React, { useEffect, useState } from 'react';
import { getSession, signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useGlobalCtx } from '@/contexts/global_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import AvatarSVG from '@/components/avater_svg/avater_svg';

enum Provider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

const AuthButton = ({
  onClick,
  provider,
  disabled = false,
}: {
  onClick: () => void;
  provider: string;
  disabled?: boolean;
}) => {
  const providerLogo =
    provider.toLowerCase() === 'google' ? '/icons/google_logo.svg' : '/icons/apple_logo.svg';
  const bgColor = provider.toLowerCase() === 'google' ? 'bg-white' : 'bg-black';
  const textColor = provider.toLowerCase() === 'google' ? 'text-black' : 'text-white';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-72 items-center justify-center space-x-2 rounded-sm ${bgColor} py-3 shadow-md`}
      disabled={disabled}
    >
      <Image src={providerLogo} alt={provider} width={16} height={16} className="h-6 w-6" />
      <span className={`font-semibold ${textColor}`}>Log In with {provider}</span>
    </button>
  );
};

const Loader = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-400 border-t-transparent"></div>
    </div>
  );
};

const isJwtExpired = (expires: string | undefined) => {
  if (!expires) return true;
  const now = new Date();
  const expirationDate = new Date(expires);
  return now > expirationDate;
};

const LoginPageBody = () => {
  const { status, data, update } = useSession();
  const user = data?.user;
  const [isLoading, setIsLoading] = useState(false);
  const [hasShowModal, setHasShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const router = useRouter();
  const {
    isAgreeWithInfomationConfirmModalVisible,
    agreeWithInfomationConfirmModalVisibilityHandler,
    userAgreeWithInfomationANDTOSNPrivacyPolicy,
  } = useGlobalCtx();

  const { trigger: agreementAPI } = APIHandler<null>(APIName.AGREE_TO_TERMS);

  const handleUserAgree = async (userId: number) => {
    // eslint-disable-next-line no-console
    console.log('handleUserAgree is called, userId', userId);
    try {
      setIsLoading(true);
      const response = await agreementAPI({
        body: { userId, agree: true },
      });
      setIsLoading(false);

      if (response.success) {
        router.push(ISUNFA_ROUTE.SELECT_COMPANY);
      } else {
        // TODO: (20240814-Tzuhan) Handle API response failure
      }
    } catch (error) {
      // TODO: (20240814-Tzuhan) Handle error case
    }
  };

  const handleUserAuthenticated = async (force?: boolean) => {
    setSelectedProvider(user.provider);
    if (user?.hasReadAgreement) {
      agreeWithInfomationConfirmModalVisibilityHandler(false);
      router.push(ISUNFA_ROUTE.SELECT_COMPANY);
    } else if ((!isAgreeWithInfomationConfirmModalVisible && !hasShowModal) || force) {
      agreeWithInfomationConfirmModalVisibilityHandler(true);
      setHasShowModal(true);
    }
  };

  useEffect(() => {
    if (userAgreeWithInfomationANDTOSNPrivacyPolicy) handleUserAgree(user.id);
  }, [userAgreeWithInfomationANDTOSNPrivacyPolicy]);

  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);

    if (status === 'unauthenticated') {
      try {
        update?.();
      } catch (error) {
        throw new Error(`Session update failed: ${error}`);
      }
    }

    if (status === 'authenticated') {
      handleUserAuthenticated();
    }
  }, [status]);

  const authenticateUser = async (provider: Provider) => {
    try {
      if (selectedProvider === provider && status === 'authenticated') {
        const session = await getSession();
        if (session && !isJwtExpired(session.expires)) {
          handleUserAuthenticated(true);
          return;
        }
      }
      setIsLoading(true);
      const response = await signIn(provider, { redirect: false });
      setIsLoading(false);

      if (response?.error) {
        throw new Error(response.error);
      }

      update?.();
      setSelectedProvider(provider);
    } catch (error) {
      // TODO: (20240814-Tzuhan) (20240813-Tzuhan) handle error
    }
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center text-center">
      <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>
      {isLoading ? (
        <Loader />
      ) : (
        <div className="z-10 mb-8 flex flex-col items-center">
          <h1 className="mb-6 text-4xl font-bold text-gray-800">Log In</h1>
          <div className="mx-2.5 mb-6 flex flex-col justify-center rounded-full">
            <AvatarSVG size="large" />
          </div>
          <div className="flex flex-col space-y-4">
            <AuthButton onClick={() => authenticateUser(Provider.GOOGLE)} provider="Google" />
            {/* Info: (20240813 - Tzuhan) Apple login is not provided in the beta version
            <AuthButton
              onClick={() => authenticateUser(Provider.APPLE)}
              provider="Apple"
              disabled
            />
            */}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPageBody;
