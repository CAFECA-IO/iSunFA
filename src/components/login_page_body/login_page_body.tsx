import React, { useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/button/button';
import { useUserCtx } from '@/contexts/user_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { ToastType } from '@/interfaces/toastify';
import { ISUNFA_ROUTE } from '@/constants/url';
import Link from 'next/link';
import { pageQueries } from '@/interfaces/page_query';
import { useTranslation } from 'next-i18next';

interface ILoginPageBodyProps {
  invitation?: string;
  action?: string;
}

const LoginPageBody = ({ invitation, action }: ILoginPageBodyProps) => {
  const { t, i18n } = useTranslation('common');
  const currentLanguage = i18n.language;

  const imageSrc =
    {
      tw: '/elements/zh_tw_login_bg.webp',
      cn: '/elements/zh_cn_login_bg.webp',
      en: '/elements/login_bg.webp',
    }[currentLanguage] || '/elements/zh_tw_login_bg.webp';

  const {
    checkIsRegistered,
    handleExistingCredential,
    signIn,
    errorCode,
    isSignInError,
    signedIn,
    toggleIsSignInError,
  } = useUserCtx();
  const {
    registerModalDataHandler,
    registerModalVisibilityHandler,
    passKeySupportModalVisibilityHandler,
    toastHandler,
  } = useGlobalCtx();

  const registerHandler = async () => {
    registerModalDataHandler({ invitation });
    registerModalVisibilityHandler();
  };

  const registerClickHandler = async () => {
    const { isRegistered, credentials } = await checkIsRegistered();
    if (isRegistered && credentials) {
      await handleExistingCredential(credentials, invitation);
    } else {
      registerHandler();
    }
  };

  const showPassKeySupport = () => {
    passKeySupportModalVisibilityHandler();
  };

  const logInClickHandler = async () => {
    try {
      await signIn({ invitation });
    } catch (error) {
      // DO nothing
    }
  };

  useEffect(() => {
    if (action === pageQueries.loginPage.actions.register) {
      registerModalDataHandler({ invitation });
      registerModalVisibilityHandler();
    } else if (action === pageQueries.loginPage.actions.login) {
      logInClickHandler();
    }
  }, [action]);

  useEffect(() => {
    /* Info: possible error code when login & register (20240522 - Shirley)
       沒有註冊資料: 401ISF0000
       伺服器錯誤: 500ISF0000
    */

    if (!signedIn && isSignInError) {
      const toastType = errorCode === `401ISF0000` ? ToastType.WARNING : ToastType.ERROR;
      const toastContent =
        errorCode === `401ISF0000` ? (
          <div>
            <div>
              {t('LOGIN_PAGE_BODY.PLEASE')}{' '}
              <button
                onClick={registerClickHandler}
                type="button"
                className="text-base text-link-text-primary hover:opacity-70"
              >
                <div className="justify-center rounded-sm">
                  {t('LOGIN_PAGE_BODY.REGISTER_YOUR_DEVICE')}
                </div>
              </button>
              <span className="pl-3">({errorCode})</span>
            </div>
          </div>
        ) : (
          <div className="">
            <p className="">
              {t('LOGIN_PAGE_BODY.OOPS')}({errorCode})
              <span className="pl-3">
                <Link href={ISUNFA_ROUTE.CONTACT_US} className="font-bold text-link-text-warning">
                  {t('LOGIN_PAGE_BODY.HELP')}
                </Link>
              </span>
            </p>
          </div>
        );

      toastHandler({
        id: `${errorCode}`,
        type: toastType,
        content: toastContent,
        closeable: true,
        onClose: toggleIsSignInError,
        autoClose: false,
      });
    }
  }, [errorCode, signedIn, isSignInError]);

  return (
    <div className="bg-surface-neutral-main-background pb-0 lg:pb-0">
      <div className="flex h-screen flex-col gap-0 pt-20 lg:flex-row lg:pt-0">
        {/* Info: 圖片區域 (20240710 - Shirley) */}
        <div className="order-2 flex w-full flex-col lg:order-1 lg:w-6/12">
          <div className="relative h-full">
            <Image src={imageSrc} fill style={{ objectFit: 'cover' }} alt="login_bg" />
          </div>
        </div>

        {/* Info: 功能區域 (20240710 - Shirley) */}
        <div className="order-1 mt-0 flex w-full flex-col justify-center lg:order-2 lg:w-6/12">
          <div className="flex flex-col items-center px-5 lg:px-20">
            <div className="text-2xl font-bold text-text-brand-primary-lv3 lg:text-5xl">
              {t('LOGIN_PAGE_BODY.LOG_IN')}
            </div>
            <div className="mt-5 text-center text-xs leading-6 tracking-normal text-text-brand-secondary-lv2 lg:mt-2 lg:text-base lg:font-medium">
              {t('LOGIN_PAGE_BODY.REGISTER_YOUR_DEVICE_ARROW')} <br />
              {t('LOGIN_PAGE_BODY.SCAN_THE_QR_CODE')}{' '}
            </div>
            <div className="mt-2 flex w-fit flex-col justify-center lg:mt-0">
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
              <Button
                variant={'tertiary'}
                onClick={logInClickHandler}
                className="mx-auto mt-0 flex max-w-400px justify-center px-4 py-1 lg:gap-2 lg:space-x-2 lg:px-6 lg:py-3.5"
              >
                <div className="text-sm leading-7 tracking-normal lg:text-lg lg:font-medium">
                  {t('LOGIN_PAGE_BODY.LOG_IN_WITH_DEVICE')}
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="24"
                  fill="none"
                  viewBox="0 0 25 24"
                >
                  <g>
                    <path
                      className="fill-current"
                      fill="none"
                      fillRule="evenodd"
                      d="M8.664 1.001h7.677c.528 0 .982 0 1.357.03.395.033.788.104 1.167.297a3 3 0 011.311 1.311c.193.379.264.772.296 1.167.031.375.03.83.03 1.357V18.84c0 .527.001.982-.03 1.356-.032.395-.103.789-.296 1.167a3 3 0 01-1.311 1.311c-.378.193-.772.264-1.167.297-.375.03-.83.03-1.357.03H8.665c-.527 0-.982 0-1.356-.03-.395-.033-.789-.104-1.167-.297a3 3 0 01-1.311-1.31c-.193-.38-.264-.773-.296-1.168a17.9 17.9 0 01-.031-1.356V5.163c0-.528 0-.982.03-1.357.033-.395.104-.788.297-1.167A3 3 0 016.14 1.33c.378-.194.772-.265 1.167-.297.374-.03.83-.03 1.356-.03zM7.471 3.025c-.272.022-.373.06-.422.085a1 1 0 00-.437.437c-.025.05-.063.15-.085.422-.023.283-.024.656-.024 1.232v13.6c0 .577 0 .949.024 1.232.022.272.06.373.085.422a1 1 0 00.437.437c.05.025.15.063.422.085.283.023.655.024 1.232.024h7.6c.576 0 .949 0 1.232-.024.272-.022.372-.06.422-.085a1 1 0 00.437-.437c.025-.05.063-.15.085-.422.023-.283.024-.655.024-1.232v-13.6c0-.576 0-.949-.024-1.232-.022-.272-.06-.372-.085-.422a1 1 0 00-.437-.437c-.05-.025-.15-.063-.422-.085-.283-.023-.655-.024-1.232-.024h-7.6c-.577 0-.949 0-1.232.024zm3.532 14.476a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"
                      clipRule="evenodd"
                    ></path>
                  </g>
                </svg>
              </Button>
            </div>

            <Button
              variant={'secondaryBorderless'}
              onClick={registerClickHandler}
              size={'medium'}
              type="button"
              className="mt-5 flex justify-center text-sm font-semibold leading-6 tracking-normal text-link-text-primary hover:opacity-70 lg:text-base"
            >
              {t('LOGIN_PAGE_BODY.REGISTER_MY_DEVICE')}
            </Button>
            <Button
              variant={'secondaryBorderless'}
              size={'medium'}
              type="button"
              onClick={showPassKeySupport}
              className="mt-5 flex justify-center gap-1 rounded-sm px-4 hover:opacity-60 lg:py-2"
            >
              <div
                onClick={showPassKeySupport}
                className="text-sm font-medium leading-5 tracking-normal text-button-text-secondary"
              >
                {t('LOGIN_PAGE_BODY.LOGIN_ENVIRONMENT_TIPS')}
              </div>
              <div className="my-auto flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="16"
                  fill="none"
                  viewBox="0 0 17 16"
                >
                  <g>
                    <path
                      fill="#001840"
                      fillRule="evenodd"
                      d="M9.128 3.294a1 1 0 011.415 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.415-1.414l2.293-2.293H3.17a1 1 0 110-2h8.252L9.128 4.708a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    ></path>
                  </g>
                </svg>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPageBody;
