import React from 'react';
import { signIn, SignInResponse } from 'next-auth/react';
import Image from 'next/image';
import { useGlobalCtx } from '@/contexts/global_context';
import APIHandler from '@/lib/utils/api_handler';
import { IUser } from '@/interfaces/user';
import { APIName } from '@/constants/api_connection';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';

enum AuthWith {
  GOOGLE = 'google',
  APPLE = 'apple',
}

const LoginPageBody = () => {
  const router = useRouter();
  const {
    isAgreeWithInfomationConfirmModalVisible,
    agreeWithInfomationConfirmModalVisibilityHandler,
    TOSNPrivacyPolicyConfirmModalCallbackHandler,
  } = useGlobalCtx();
  const { trigger: logInTrigger } = APIHandler<{
    user: IUser;
    hasReadAgreement: boolean;
  }>(APIName.LOGIN);
  const { trigger: agreementTrigger } = APIHandler<null>(APIName.AGREEMENT);

  const handleUserAgree = async (authWith: AuthWith) => {
    try {
      // 呼叫 API 紀錄用戶已同意條款
      const response = await agreementTrigger({
        body: { authWith, agreement: true },
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

  // 新增：呼叫後端 signInAPI
  const callLogInAPI = async (authWith: AuthWith, oauthResponse: SignInResponse | undefined) => {
    try {
      const response = await logInTrigger({
        body: { authWith, oauthResponse },
      });

      // 處理後端返回的 user 和 hasReadAgreement 資料
      const { success, data } = response;
      if (success && data) {
        const { user, hasReadAgreement } = data;
        if (!hasReadAgreement && !isAgreeWithInfomationConfirmModalVisible) {
          // 如果用戶尚未同意條款，顯示同意條款的模態框
          TOSNPrivacyPolicyConfirmModalCallbackHandler(() => handleUserAgree(authWith));
          agreeWithInfomationConfirmModalVisibilityHandler();
        } else {
          // 用戶已經同意條款，直接進行登入後的邏輯處理。TODO: (20240812-Tzuhan) route to select-company page
          // eslint-disable-next-line no-console
          console.log('用戶已登入:', user);
          router.push(ISUNFA_ROUTE.SELECT_COMPANY);
        }
      } else {
        // eslint-disable-next-line no-console
        console.error('登入 API 錯誤:', response);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('登入 API 錯誤:', error);
    }
  };

  // 登入處理函數，呼叫 OAuth 登入並獲取響應後再呼叫 signInAPI
  const loginHandler = async (authWith: AuthWith) => {
    try {
      // eslint-disable-next-line no-console
      console.log('loginHandler:', authWith);
      const oauthResponse = await signIn(authWith, { redirect: false });

      if (oauthResponse?.error) {
        // eslint-disable-next-line no-console
        console.error('OAuth 登入失敗:', oauthResponse.error);
      } else {
        // 呼叫後端 signInAPI 處理登入
        await callLogInAPI(authWith, oauthResponse);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('登入處理函數錯誤:', error);
    }
  };

  // 處理 Apple 登入
  const AuthWithApple = () => loginHandler(AuthWith.APPLE);

  // 處理 Google 登入
  const AuthWithGoogle = () => loginHandler(AuthWith.GOOGLE);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center text-center">
      {/* 背景圖片 */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/login_bg.svg"
          alt="Background"
          layout="fill"
          objectFit="cover"
          quality={100}
        />
        {/* 白色透明遮罩 */}
        <div className="absolute inset-0 bg-white opacity-10"></div>
      </div>
      <div className="z-1 mb-8 flex flex-col items-center">
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
            <Image src="/icons/google_logo.svg" alt="Google" className="h-6 w-6" />
            <span className="font-semibold">Log In with Google</span>
          </button>
          <button
            type="button"
            onClick={AuthWithApple}
            className="flex w-72 items-center justify-center space-x-2 rounded-lg bg-black py-3 text-white shadow-md"
          >
            <Image src="/icons/apple_logo.svg" alt="Apple" className="h-6 w-6" />
            <span className="font-semibold">Log In with Apple</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPageBody;
