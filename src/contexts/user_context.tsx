import useStateRef from 'react-usestateref';
import eventManager from '@/lib/utils/event_manager';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { FREE_COMPANY_ID } from '@/constants/config';
import { ISUNFA_ROUTE } from '@/constants/url';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ICompany } from '@/interfaces/company';
import { IUser } from '@/interfaces/user';
import { throttle } from '@/lib/utils/common';
import { Provider } from '@/constants/provider';
import { signIn as authSignIn, signOut as authSignOut } from 'next-auth/react';
import { ILoginPageProps } from '@/interfaces/page_props';
import { Hash } from '@/constants/hash';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { clearAllItems } from '@/lib/utils/indexed_db/ocr';

interface UserContextType {
  credential: string | null;
  signOut: () => void;
  userAuth: IUser | null;
  username: string | null;
  signedIn: boolean;
  isAgreeInfoCollection: boolean;
  isAgreeTosNPrivacyPolicy: boolean;
  isSignInError: boolean;
  selectedCompany: ICompany | null;
  selectCompany: (company: ICompany | null, isPublic?: boolean) => Promise<void>;
  successSelectCompany: boolean | undefined;
  errorCode: string | null;
  toggleIsSignInError: () => void;
  isAuthLoading: boolean;
  returnUrl: string | null;
  checkIsRegistered: () => Promise<{
    isRegistered: boolean;
    credentials: PublicKeyCredential | null;
  }>;

  userAgreeResponse: {
    success: boolean;
    data: null;
    code: string;
    error: Error | null;
  } | null;
  handleUserAgree: (hash: Hash) => Promise<void>;
  authenticateUser: (selectProvider: Provider, props: ILoginPageProps) => Promise<void>;
}

export const UserContext = createContext<UserContextType>({
  credential: null,
  signOut: () => {},
  userAuth: null,
  username: null,
  signedIn: false,
  isAgreeInfoCollection: false,
  isAgreeTosNPrivacyPolicy: false,
  isSignInError: false,
  selectedCompany: null,
  selectCompany: async () => {},
  successSelectCompany: undefined,
  errorCode: null,
  toggleIsSignInError: () => {},
  isAuthLoading: false,
  returnUrl: null,
  checkIsRegistered: async () => {
    return { isRegistered: false, credentials: null };
  },

  userAgreeResponse: null,
  handleUserAgree: async () => {},
  authenticateUser: async () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const EXPIRATION_TIME = 1000 * 60 * 60 * 1; // Info: (20240822) 1 hours

  const [, setSignedIn, signedInRef] = useStateRef(false);
  const [, setCredential, credentialRef] = useStateRef<string | null>(null);
  const [userAuth, setUserAuth, userAuthRef] = useStateRef<IUser | null>(null);
  const [, setUsername, usernameRef] = useStateRef<string | null>(null);
  const [, setSelectedCompany, selectedCompanyRef] = useStateRef<ICompany | null>(null);
  const [, setSuccessSelectCompany, successSelectCompanyRef] = useStateRef<boolean | undefined>(
    undefined
  );
  const [, setIsSignInError, isSignInErrorRef] = useStateRef(false);
  const [, setErrorCode, errorCodeRef] = useStateRef<string | null>(null);
  const [, setIsAuthLoading, isAuthLoadingRef] = useStateRef(false);
  const [returnUrl, setReturnUrl, returnUrlRef] = useStateRef<string | null>(null);
  const [, setIsAgreeInfoCollection, isAgreeInfoCollectionRef] = useStateRef(false);
  const [, setIsAgreeTosNPrivacyPolicy, isAgreeTosNPrivacyPolicyRef] = useStateRef(false);
  const [, setUserAgreeResponse, userAgreeResponseRef] = useStateRef<{
    success: boolean;
    data: null;
    code: string;
    error: Error | null;
  } | null>(null);
  const isRouteChanging = useRef(false);

  const { trigger: signOutAPI } = APIHandler<void>(APIName.SIGN_OUT, {
    body: { credential: credentialRef.current },
  });
  const { trigger: createChallengeAPI } = APIHandler<string>(APIName.CREATE_CHALLENGE);
  const { trigger: selectCompanyAPI } = APIHandler<ICompany>(APIName.COMPANY_SELECT);
  const { trigger: getStatusInfoAPI } = APIHandler<{ user: IUser; company: ICompany }>(
    APIName.STATUS_INFO_GET
  );
  const { trigger: agreementAPI } = APIHandler<null>(APIName.AGREE_TO_TERMS);

  const toggleIsSignInError = () => {
    setIsSignInError(!isSignInErrorRef.current);
  };

  const clearState = () => {
    setUserAuth(null);
    setUsername(null);
    setCredential(null);
    setSignedIn(false);
    setIsSignInError(false);
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);
    localStorage.removeItem('userId');
    localStorage.removeItem('expired_at');
    clearAllItems(); // Info: 清空 IndexedDB 中的數據 (20240822 - Shirley)
  };

  // Info: (20240530 - Shirley) 在瀏覽器被重新整理後，如果沒有登入，就 redirect to login page
  const handleNotSignedIn = () => {
    clearState();
    if (router.pathname.startsWith('/users') && !router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
      router.push(ISUNFA_ROUTE.LOGIN);
    }
  };

  const handleSignInRoute = () => {
    if (isAgreeInfoCollectionRef.current && isAgreeTosNPrivacyPolicyRef.current) {
      router.push(ISUNFA_ROUTE.SELECT_COMPANY);
    }
  };

  const checkIsRegistered = async (): Promise<{
    isRegistered: boolean;
    credentials: PublicKeyCredential | null;
  }> => {
    // Info: (20240730 - Tzuhan) 生成挑戰
    const { data: newChallengeBase64, success, code } = await createChallengeAPI();

    if (!success || !newChallengeBase64) {
      throw new Error(code);
    }

    // Info: (20240730 - Tzuhan) 將 base64 轉換成 Uint8Array
    const newChallenge = Uint8Array.from(atob(newChallengeBase64), (c) => c.charCodeAt(0));

    // Info: (20240730 - Tzuhan) 檢查是否已有綁定的憑證
    const credentials = (await navigator.credentials.get({
      publicKey: {
        challenge: newChallenge, // Info: (20240730 - Tzuhan)  使用生成的挑戰
        allowCredentials: [], // Info: (20240730 - Tzuhan)  查詢已綁定的憑證
        timeout: 60000,
        userVerification: 'required',
      },
    })) as PublicKeyCredential;

    if (credentials) {
      return {
        isRegistered: true,
        credentials,
      };
    }
    return {
      isRegistered: false,
      credentials: null,
    };
  };

  const handleReturnUrl = () => {
    if (isAgreeInfoCollectionRef.current && isAgreeTosNPrivacyPolicyRef.current) {
      if (returnUrl) {
        const urlString = decodeURIComponent(returnUrl);
        setReturnUrl(null);
        router.push(urlString);
      } else if (
        router.pathname.includes(ISUNFA_ROUTE.SELECT_COMPANY) ||
        (selectedCompanyRef.current && router.pathname.includes(ISUNFA_ROUTE.LOGIN))
      ) {
        router.push(ISUNFA_ROUTE.DASHBOARD);
      }
    }
  };

  const signOut = async () => {
    await signOutAPI();
    await authSignOut({ redirect: false });
    handleNotSignedIn();
  };

  const isProfileFetchNeeded = () => {
    const userId = localStorage.getItem('userId');
    const expiredAt = localStorage.getItem('expired_at');
    const isUserAuthAvailable = !!userAuthRef.current;

    // Info: (20240822-Tzuhan) 如果 state 中沒有用戶資料，且 localStorage 中有記錄，則應該重新獲取 profile
    if (!isUserAuthAvailable && userId && expiredAt) {
      // Info: (20240822-Tzuhan) 如果 expiredAt 未過期，應該重新獲取 profile
      if (Date.now() < Number(expiredAt)) {
        return true;
      } else {
        signOut();
        return false;
      }
    }

    // Info: (20240822-Tzuhan) 如果 state 中有用戶資料，且 localStorage 中沒有記錄，則應該重新獲取 profile
    if (isUserAuthAvailable && (!userId || !expiredAt)) {
      return true;
    }

    // Info: (20240822-Tzuhan) 如果 state 和 localStorage 中都沒有用戶資料，則應該重新獲取 profile
    if (!isUserAuthAvailable && (!userId || !expiredAt)) {
      return true;
    }

    // Info: (20240822-Tzuhan) 以上情況都不滿足，則不需要重新獲取 profile
    return false;
  };

  // Info: (20240409 - Shirley) 在用戶一進到網站後就去驗證是否登入
  const getStatusInfo = useCallback(async () => {
    const isNeed = isProfileFetchNeeded();
    if (!isNeed) return;
    setIsAuthLoading(true);
    const {
      data: StatusInfo,
      success: getStatusInfoSuccess,
      code: getStatusInfoCode,
    } = await getStatusInfoAPI();
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);
    if (getStatusInfoSuccess) {
      if (StatusInfo) {
        if ('user' in StatusInfo && StatusInfo.user && Object.keys(StatusInfo.user).length > 0) {
          setUserAuth(StatusInfo.user);
          setUsername(StatusInfo.user.name);
          setSignedIn(true);
          setIsSignInError(false);
          localStorage.setItem('userId', StatusInfo.user.id.toString());
          localStorage.setItem('expired_at', (Date.now() + EXPIRATION_TIME).toString());
          if (StatusInfo.user.agreementList.includes(Hash.INFO_COLLECTION)) {
            setIsAgreeInfoCollection(true);
          } else {
            setIsAgreeInfoCollection(false);
          }
          if (StatusInfo.user.agreementList.includes(Hash.TOS_N_PP)) {
            setIsAgreeTosNPrivacyPolicy(true);
          } else {
            setIsAgreeTosNPrivacyPolicy(false);
          }
          if (
            'company' in StatusInfo &&
            StatusInfo.company &&
            Object.keys(StatusInfo.company).length > 0
          ) {
            setSelectedCompany(StatusInfo.company);
            setSuccessSelectCompany(true);
            handleReturnUrl();
          } else {
            setSuccessSelectCompany(undefined);
            setSelectedCompany(null);
            if (
              router.pathname.includes('users') &&
              !router.pathname.includes(ISUNFA_ROUTE.SELECT_COMPANY)
            ) {
              handleSignInRoute();
            }
          }
        } else {
          handleNotSignedIn();
        }
      }
    }
    if (getStatusInfoSuccess === false) {
      handleNotSignedIn();
      setIsSignInError(true);
      setErrorCode(getStatusInfoCode ?? '');
    }
    setIsAuthLoading(false);
  }, [router.pathname]);

  // Info: (20240903 - Shirley) 第一次登入，在用戶同意後，重新導向到選擇公司的頁面
  useEffect(() => {
    handleSignInRoute();
  }, [userAgreeResponseRef.current]);

  const handleUserAgree = async (hash: Hash) => {
    try {
      setIsAuthLoading(true);
      const response = await agreementAPI({
        params: { userId: userAuth?.id },
        body: { agreementHash: hash },
      });
      setUserAgreeResponse(response);
      setIsAuthLoading(false);
      if (hash === Hash.INFO_COLLECTION) {
        setIsAgreeInfoCollection(true);
      }
      if (hash === Hash.TOS_N_PP) {
        setIsAgreeTosNPrivacyPolicy(true);
      }
    } catch (error) {
      setUserAgreeResponse({
        success: false,
        data: null,
        code: '',
        error: error as Error,
      });
    }
  };

  const authenticateUser = async (selectProvider: Provider, props: ILoginPageProps) => {
    try {
      setIsAuthLoading(true);
      const response = await authSignIn(
        selectProvider,
        { redirect: false },
        // eslint-disable-next-line react/prop-types
        { invitation: props.invitation }
      );

      if (response?.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      // TODO: (20240814-Tzuhan) [Beta] handle error
    }
  };

  const handleSelectCompanyResponse = async (response: {
    success: boolean;
    data: ICompany | null;
    code: string;
    error: Error | null;
  }) => {
    if (response.success && response.data !== null) {
      setSelectedCompany(response.data);
      setSuccessSelectCompany(true);
      handleReturnUrl();
    }
    if (response.success === false) {
      setSelectedCompany(null);
      setSuccessSelectCompany(false);
      setErrorCode(response.code ?? '');
    }
  };

  // Info: (20240513 - Julian) 選擇公司的功能
  const selectCompany = async (company: ICompany | null, isPublic = false) => {
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);

    const res = await selectCompanyAPI({
      params: {
        companyId: !company && !isPublic ? -1 : (company?.id ?? FREE_COMPANY_ID),
      },
    });

    if (!company && !isPublic) {
      router.push(ISUNFA_ROUTE.SELECT_COMPANY);
      return;
    }
    await handleSelectCompanyResponse(res);
  };

  const throttledGetStatusInfo = useCallback(
    throttle(() => {
      getStatusInfo();
    }, 100),
    [getStatusInfo]
  );

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && !isRouteChanging.current) {
      throttledGetStatusInfo();
    }
  }, [throttledGetStatusInfo]);

  const handleRouteChangeStart = useCallback(() => {
    if (router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
      isRouteChanging.current = true;
      throttledGetStatusInfo();
    }
  }, [throttledGetStatusInfo, router.pathname]);

  const handleRouteChangeComplete = useCallback(() => {
    isRouteChanging.current = false;
  }, []);

  useEffect(() => {
    getStatusInfo();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [handleVisibilityChange, handleRouteChangeStart, handleRouteChangeComplete, router.events]);

  useEffect(() => {
    const handleUnauthorizedAccess = () => {
      signOut();
    };

    // Info: (20240822-Tzuhan) 確保只有一個監聽器
    eventManager.off(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, handleUnauthorizedAccess);
    eventManager.on(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, handleUnauthorizedAccess);

    return () => {
      eventManager.off(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, handleUnauthorizedAccess);
    };
  }, [signOut]);

  // Info: (20240522 - Shirley) dependency array 的值改變，才會讓更新後的 value 傳到其他 components
  const value = useMemo(
    () => ({
      credential: credentialRef.current,
      signOut,
      userAuth: userAuthRef.current,
      username: usernameRef.current,
      signedIn: signedInRef.current,
      isAgreeInfoCollection: isAgreeInfoCollectionRef.current,
      isAgreeTosNPrivacyPolicy: isAgreeTosNPrivacyPolicyRef.current,
      isSignInError: isSignInErrorRef.current,
      selectedCompany: selectedCompanyRef.current,
      selectCompany,
      successSelectCompany: successSelectCompanyRef.current,
      errorCode: errorCodeRef.current,
      toggleIsSignInError,
      isAuthLoading: isAuthLoadingRef.current,
      returnUrl: returnUrlRef.current,
      checkIsRegistered,
      handleUserAgree,
      authenticateUser,
      userAgreeResponse: userAgreeResponseRef.current,
    }),
    [
      credentialRef.current,
      selectedCompanyRef.current,
      successSelectCompanyRef.current,
      errorCodeRef.current,
      isSignInErrorRef.current,
      isAuthLoadingRef.current,
      returnUrlRef.current,
      router.pathname,
    ]
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserCtx = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserCtx must be used within a UserProvider');
  }
  return context;
};
