import React, { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useGlobalCtx } from '@/contexts/global_context';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';

enum Provider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

const AvatarSVG = ({ size }: { size: 'large' | 'small' }) => {
  const width = size === 'large' ? 201 : 100;
  const height = width;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill="none"
      viewBox="0 0 201 200"
    >
      <path
        fill="#CDD1D9"
        d="M.5 100C.5 44.772 45.272 0 100.5 0s100 44.772 100 100-44.772 100-100 100S.5 155.228.5 100z"
      ></path>
      <g clipPath="url(#clip0_13_13411)">
        <path
          fill="#7F8A9D"
          fillRule="evenodd"
          d="M100.5 68.013c-11.942 0-21.623 9.68-21.623 21.622 0 8.151 4.51 15.249 11.17 18.934a31.953 31.953 0 00-19.976 20.439 2.286 2.286 0 002.177 2.984h56.503a2.284 2.284 0 002.176-2.984 31.956 31.956 0 00-19.975-20.439c6.661-3.685 11.171-10.782 11.171-18.934 0-11.942-9.681-21.622-21.623-21.622z"
          clipRule="evenodd"
        ></path>
      </g>
      <defs>
        <clipPath id="clip0_13_13411">
          <path fill="#fff" d="M0 0H64V64H0z" transform="translate(68.5 68)"></path>
        </clipPath>
      </defs>
    </svg>
  );
};

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
      className={`flex w-72 items-center justify-center space-x-2 rounded-lg ${bgColor} py-3 shadow-md`}
      disabled={disabled}
    >
      <Image src={providerLogo} alt={provider} width={16} height={16} className="h-6 w-6" />
      <span className={`font-semibold ${textColor}`}>Log In with {provider}</span>
    </button>
  );
};

// Spinning Loader Component
const Loader = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-400 border-t-transparent"></div>
    </div>
  );
};

const LoginPageBody = () => {
  const { status, data, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [hasShowModal, setHasShowModal] = useState(false);
  const router = useRouter();
  const {
    isAgreeWithInfomationConfirmModalVisible,
    agreeWithInfomationConfirmModalVisibilityHandler,
    TOSNPrivacyPolicyConfirmModalCallbackHandler,
  } = useGlobalCtx();

  const { trigger: agreementAPI } = APIHandler<null>(APIName.AGREE_TO_TERMS);

  const handleUserAgree = async (provider: Provider) => {
    try {
      setIsLoading(true);
      const response = await agreementAPI({
        body: { provider, agree: true },
      });
      setIsLoading(false);

      if (response.success) {
        router.push(ISUNFA_ROUTE.SELECT_COMPANY);
      } else {
        // TODO: Handle API response failure
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('紀錄用戶同意條款時發生錯誤:', error);
      // TODO: Handle error case
    }
  };

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
        // eslint-disable-next-line no-console
        console.error('Session update failed:', error);
      }
    }

    if (status === 'authenticated') {
      const user = data?.user;

      if (user?.hasReadAgreement) {
        agreeWithInfomationConfirmModalVisibilityHandler(false);
        router.push(ISUNFA_ROUTE.SELECT_COMPANY);
      } else {
        TOSNPrivacyPolicyConfirmModalCallbackHandler(() => handleUserAgree(user.id));
        if (!isAgreeWithInfomationConfirmModalVisible && !hasShowModal) {
          agreeWithInfomationConfirmModalVisibilityHandler(true);
          setHasShowModal(true);
        }
      }
    }
  }, [status]);

  const authenticateUser = async (provider: Provider) => {
    try {
      setIsLoading(true);
      const response = await signIn(provider, { redirect: false });
      setIsLoading(false);

      if (response?.error) {
        // eslint-disable-next-line no-console
        console.error('OAuth 登入失敗:', response?.error);
        throw new Error(response.error);
      }

      update?.();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Authentication failed', error);
      // TODO: (20240813-Tzuhan) handle error
    }
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center text-center">
      <div className="absolute inset-0 z-0 h-full w-full blur-md">
        <Image
          src="/images/login_bg.svg"
          alt="login_bg"
          layout="fill"
          objectFit="cover"
          className="blur-md"
        />
      </div>
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
            <AuthButton
              onClick={() => authenticateUser(Provider.APPLE)}
              provider="Apple"
              disabled
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPageBody;
