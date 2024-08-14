import React, { useEffect } from 'react';
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

const LoginPageBody = () => {
  const session = useSession();
  const { status, data, update } = session;
  const router = useRouter();
  const {
    isAgreeWithInfomationConfirmModalVisible,
    agreeWithInfomationConfirmModalVisibilityHandler,
    TOSNPrivacyPolicyConfirmModalCallbackHandler,
  } = useGlobalCtx();

  const { trigger: agreementAPI } = APIHandler<null>(APIName.AGREE_TO_TERMS);

  const handleUserAgree = async (provider: Provider) => {
    try {
      // 呼叫 API 紀錄用戶已同意條款
      const response = await agreementAPI({
        body: { provider, agree: true },
      });

      const { success, code } = response;
      // eslint-disable-next-line no-console
      console.log('紀錄用戶同意條款:', success, code);
      router.push(ISUNFA_ROUTE.SELECT_COMPANY);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('紀錄用戶同意條款時發生錯誤:', error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('session:', session);
    if (status === 'unauthenticated') {
      try {
        if (typeof update === 'function') {
          update();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Session update failed:', error);
        // 可能需要跳轉到錯誤頁面或顯示錯誤消息
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `status: ${status}, isAgreeWithInfomationConfirmModalVisible: ${isAgreeWithInfomationConfirmModalVisible}, user.hasReadAgreement: ${data?.user?.hasReadAgreement}`
    );
    if (status === 'authenticated') {
      const user = data?.user;
      if (user && user?.hasReadAgreement) {
        if (isAgreeWithInfomationConfirmModalVisible) {
          agreeWithInfomationConfirmModalVisibilityHandler();
        }
        // 用户已同意條款，跳轉到公司選擇頁面
        // eslint-disable-next-line no-console
        console.log('用户已同意條款，跳轉到公司選擇頁面');
        router.push(ISUNFA_ROUTE.SELECT_COMPANY);
      } else if (user && !user?.hasReadAgreement) {
        TOSNPrivacyPolicyConfirmModalCallbackHandler(() => handleUserAgree(user?.id));
        // eslint-disable-next-line no-console
        console.log('用户未同意條款，顯示確認框');
        if (!isAgreeWithInfomationConfirmModalVisible) {
          agreeWithInfomationConfirmModalVisibilityHandler();
        }
      }
    }
  }, [isAgreeWithInfomationConfirmModalVisible, status]);

  // 登入處理函數，呼叫 OAuth 登入並獲取響應後再呼叫 signInAPI
  const authenticateUser = async (provider: Provider) => {
    try {
      // eslint-disable-next-line no-console
      console.log('authenticateUser:', provider);
      const response = await signIn(provider, {
        redirect: false,
      });
      if (response?.error) {
        // eslint-disable-next-line no-console
        console.error('OAuth 登入失敗:', response?.error);
        throw new Error(response.error);
      }
      // eslint-disable-next-line no-console
      console.log('User authenticated successfully, response:', response);
      // 更新 session 或執行其他後續動作
      update();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Authentication failed', error);
      // TODO: (20240813-Tzuhan) handle error
    }
  };

  // 處理 Apple 登入
  const AuthWithApple = () => authenticateUser(Provider.APPLE);

  // 處理 Google 登入
  const AuthWithGoogle = () => authenticateUser(Provider.GOOGLE);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center text-center">
      {/* 背景圖片 */}
      <div className="absolute inset-0 z-0 h-full w-full blur-md">
        <Image
          loading="lazy"
          src="/images/login_bg.svg"
          alt="login_bg"
          fill
          style={{
            objectFit: 'cover',
          }}
          quality={100}
        />
      </div>
      <div className="z-10 mb-8 flex flex-col items-center">
        <h1 className="mb-6 text-4xl font-bold text-gray-800">Log In</h1>
        <div className="mx-2.5 flex flex-col justify-center rounded-full">
          <div className="flex aspect-square items-center justify-center px-5 lg:px-10">
            <div className="mx-2 hidden items-center justify-center lg:flex">
              {/* 匿名頭像 */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="201"
                height="200"
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
            </div>
            <div className="mx-2 flex items-center justify-center lg:hidden">
              {/* 匿名頭像 */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="100"
                height="100"
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
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          <button
            type="button"
            onClick={AuthWithGoogle}
            className="flex w-72 items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white py-3 shadow-md"
          >
            <Image
              src="/icons/google_logo.svg"
              alt="Google"
              width={16}
              height={16}
              className="h-6 w-6"
            />
            <span className="font-semibold">Log In with Google</span>
          </button>
          <button
            type="button"
            onClick={AuthWithApple}
            className="flex w-72 cursor-not-allowed items-center justify-center space-x-2 rounded-lg bg-black py-3 text-white shadow-md"
            disabled
          >
            <Image
              src="/icons/apple_logo.svg"
              alt="Apple"
              width={16}
              height={16}
              className="h-6 w-6"
            />
            <span className="font-semibold">Log In with Apple</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPageBody;
