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
  // Info: (2024705 - Anna) 用 t 獲取翻譯文本，使用 i18n.language 獲取當前語言
  const { t, i18n } = useTranslation('common');
  const currentLanguage = i18n.language;

  // Info: (2024705 - Anna) 根據語言設置圖片
  const imageSrc =
    {
      tw: '/elements/zh_tw_login_bg.png',
      cn: '/elements/zh_cn_login_bg.png',
      en: '/elements/login_bg.png',
    }[currentLanguage] || '/elements/zh_tw_login_bg.png'; // Info: (2024705 - Anna) 默認圖片

  const { signIn, errorCode, isSignInError, signedIn, toggleIsSignInError } = useUserCtx();
  const {
    registerModalDataHandler,
    registerModalVisibilityHandler,
    passKeySupportModalVisibilityHandler,
    toastHandler,
  } = useGlobalCtx();

  const registerClickHandler = async () => {
    registerModalDataHandler({ invitation });
    registerModalVisibilityHandler();
  };

  const showPassKeySupport = () => {
    passKeySupportModalVisibilityHandler();
  };

  const logInClickHandler = async () => {
    try {
      await signIn({ invitation });
    } catch (error) {
      // Deprecated: dev (20240410 - Shirley)
      // eslint-disable-next-line no-console
      console.error('signIn error in loginClickHandler:', error);
      // registerClickHandler();
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
       沒有註冊資料: 511ISF0001
       伺服器錯誤: 500ISF0000
    */

    if (!signedIn && isSignInError) {
      const toastType = errorCode === `511ISF0001` ? ToastType.WARNING : ToastType.ERROR;
      const toastContent =
        errorCode === `511ISF0001` ? (
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
    <div>
      <div className="bg-surface-neutral-main-background pb-36 lg:pb-0">
        <div className="flex gap-5 max-lg:flex-col max-lg:gap-0">
          <div className="order-2 hidden w-6/12 flex-col max-lg:ml-0 max-lg:w-full lg:order-1 lg:flex">
            <div className="pointer-events-none -mt-20px flex grow flex-col justify-start max-lg:max-w-full md:-mt-50px lg:-mt-65px">
              <div className="relative flex h-full w-full flex-col overflow-hidden max-lg:max-w-full">
                <Image src={imageSrc} fill style={{ objectFit: 'cover' }} alt="login_bg" />
              </div>
            </div>
          </div>
          <div className="order-1 ml-5 flex w-6/12 flex-col max-lg:ml-0 max-lg:w-full lg:order-2">
            <div className="flex grow flex-col justify-center pb-20 max-lg:max-w-full">
              <div className="mt-12 flex flex-col items-center px-20 max-lg:max-w-full max-lg:px-5 lg:mt-20">
                <div className="flex flex-col items-center justify-center self-stretch px-20 max-lg:max-w-full max-lg:px-5">
                  <div className="text-2xl font-bold text-amber-400 lg:text-5xl">
                    {t('LOGIN_PAGE_BODY.LOG_IN')}
                  </div>
                  <div className="mt-5 text-center text-xs leading-6 tracking-normal text-slate-600 lg:mt-2 lg:text-base lg:font-medium">
                    {t('LOGIN_PAGE_BODY.REGISTER_YOUR_DEVICE_ARROW')} <br />
                    {t('LOGIN_PAGE_BODY.SCAN_THE_QR_CODE')}{' '}
                  </div>
                </div>
                <div className="mt-2 flex max-w-full flex-col justify-center lg:mt-10">
                  <div className="flex flex-col justify-center rounded-full max-lg:mx-2.5">
                    <div className="flex aspect-square flex-col items-center justify-center px-16 max-lg:px-5">
                      <div className="mx-2 hidden items-center justify-center lg:flex">
                        {/* Info: anonymous avatar (20240422 - Shirley) */}
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
                              <path
                                fill="#fff"
                                d="M0 0H64V64H0z"
                                transform="translate(68.5 68)"
                              ></path>
                            </clipPath>
                          </defs>
                        </svg>
                      </div>

                      <div className="mx-2 flex flex items-center justify-center lg:hidden">
                        {/* Info: anonymous avatar (20240422 - Shirley) */}
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
                              <path
                                fill="#fff"
                                d="M0 0H64V64H0z"
                                transform="translate(68.5 68)"
                              ></path>
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
                  <button
                    onClick={registerClickHandler}
                    type="button"
                    className="mt-5 flex max-w-full flex-col justify-center self-center text-sm font-semibold leading-6 tracking-normal text-link-text-primary hover:opacity-70 lg:mt-10 lg:text-base"
                  >
                    <div className="justify-center rounded-sm">
                      {t('LOGIN_PAGE_BODY.REGISTER_MY_DEVICE')}
                    </div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={showPassKeySupport}
                  className="mt-5 flex justify-center gap-1 rounded-sm px-4 hover:opacity-70 lg:mt-10 lg:py-2"
                >
                  <div
                    onClick={showPassKeySupport}
                    className="text-sm font-medium leading-5 tracking-normal text-secondaryBlue"
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
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPageBody;
