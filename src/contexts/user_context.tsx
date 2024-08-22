import useStateRef from 'react-usestateref';
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
  isAuthLoading: true,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [signedIn, setSignedIn, signedInRef] = useStateRef(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [credential, setCredential, credentialRef] = useStateRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userAuth, setUserAuth, userAuthRef] = useStateRef<IUser | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [username, setUsername, usernameRef] = useStateRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCompany, setSelectedCompany, selectedCompanyRef] = useStateRef<ICompany | null>(
    null
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [successSelectCompany, setSuccessSelectCompany, successSelectCompanyRef] = useStateRef<
    boolean | undefined
  >(undefined);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSignInError, setIsSignInError, isSignInErrorRef] = useStateRef(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [errorCode, setErrorCode, errorCodeRef] = useStateRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAuthLoading, setIsAuthLoading, isAuthLoadingRef] = useStateRef(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [returnUrl, setReturnUrl, returnUrlRef] = useStateRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAgreeInfoCollection, setIsAgreeInfoCollection, isAgreeInfoCollectionRef] =
    useStateRef(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAgreeTosNPrivacyPolicy, setIsAgreeTosNPrivacyPolicy, isAgreeTosNPrivacyPolicyRef] =
    useStateRef(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userAgreeResponse, setUserAgreeResponse, userAgreeResponseRef] = useStateRef<{
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
  const { trigger: getUserSessionData } = APIHandler<{ user: IUser; company: ICompany }>(
    APIName.SESSION_GET
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
  };

  // Info: (20240530 - Shirley) 在瀏覽器被重新整理後，如果沒有登入，就 redirect to login page
  const handleNotSignedIn = () => {
    clearState();
    if (router.pathname.startsWith('/users') && !router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
      // if (router.pathname !== ISUNFA_ROUTE.SELECT_COMPANY) {
      //   setReturnUrl(encodeURIComponent(router.asPath));
      // }
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
      // eslint-disable-next-line no-console
      console.log(
        `handleReturnUrl returnUrl: ${decodeURIComponent(returnUrl ?? '')}, router.pathname: ${router.pathname}, selectedCompanyRef.current:`,
        selectedCompanyRef.current
      );
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

  // TODO: (20240819-Tzuhan) [Beta] handle expiration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isJwtExpired = (expires: string | undefined) => {
    if (!expires) return true;
    const now = new Date();
    const expirationDate = new Date(expires);
    return now > expirationDate;
  };

  // Info: (20240409 - Shirley) 在用戶一進到網站後就去驗證是否登入
  const checkSession = useCallback(async () => {
    setIsAuthLoading(true);
    const {
      data: userSessionData,
      success: getUserSessionSuccess,
      code: getUserSessionCode,
    } = await getUserSessionData();
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);
    if (getUserSessionSuccess) {
      if (userSessionData) {
        // eslint-disable-next-line no-console
        console.log(
          'checkSession userSessionData',
          userSessionData,
          `'company' in userSessionData && Object.keys(userSessionData.company).length > 0: ${'company' in userSessionData && userSessionData.company && Object.keys(userSessionData.company).length > 0}`
        );
        if (
          'user' in userSessionData &&
          userSessionData.user &&
          Object.keys(userSessionData.user).length > 0
        ) {
          setUserAuth(userSessionData.user);
          setUsername(userSessionData.user.name);
          setSignedIn(true);
          setIsSignInError(false);
          if (userSessionData.user.agreementList.includes(Hash.INFO_COLLECTION)) {
            setIsAgreeInfoCollection(true);
          } else {
            setIsAgreeInfoCollection(false);
          }
          if (userSessionData.user.agreementList.includes(Hash.TOS_N_PP)) {
            setIsAgreeTosNPrivacyPolicy(true);
          } else {
            setIsAgreeTosNPrivacyPolicy(false);
          }
          if (
            'company' in userSessionData &&
            userSessionData.company &&
            Object.keys(userSessionData.company).length > 0
          ) {
            setSelectedCompany(userSessionData.company);
            setSuccessSelectCompany(true);
            handleReturnUrl();
          } else {
            setSuccessSelectCompany(undefined);
            setSelectedCompany(null);
            // eslint-disable-next-line no-console
            console.log('checkSession: no company');
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
    if (getUserSessionSuccess === false) {
      handleNotSignedIn();
      setIsSignInError(true);
      setErrorCode(getUserSessionCode ?? '');
    }
    setIsAuthLoading(false);
  }, [router.pathname]);

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

      // Deprecate: [Beta](20240819-Tzuhan) dev
      // eslint-disable-next-line no-console
      console.log('authenticateUser authSignIn response:', response);

      if (response?.error) {
        // Deprecate: [Beta](20240819-Tzuhan) dev
        // eslint-disable-next-line no-console
        console.error('OAuth 登入失敗:', response?.error);
        throw new Error(response.error);
      }
    } catch (error) {
      // Deprecate: [Beta](20240816-Tzuhan) dev
      // eslint-disable-next-line no-console
      console.error('Authentication failed', error);
      // TODO: (20240814-Tzuhan) [Beta] handle error
    }
  };

  const throttledCheckSession = useCallback(
    throttle(() => {
      checkSession();
    }, 100),
    [checkSession]
  );

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

  const signOut = async () => {
    signOutAPI();
    authSignOut();
    clearState();
    router.push(ISUNFA_ROUTE.LOGIN);
  };

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && !isRouteChanging.current) {
      throttledCheckSession();
    }
  }, [throttledCheckSession]);

  const handleRouteChangeStart = useCallback(() => {
    if (router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
      isRouteChanging.current = true;
      throttledCheckSession();
    }
  }, [throttledCheckSession, router.pathname]);

  const handleRouteChangeComplete = useCallback(() => {
    isRouteChanging.current = false;
  }, []);

  useEffect(() => {
    checkSession();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [
    handleVisibilityChange,
    handleRouteChangeStart,
    handleRouteChangeComplete,
    router.events,
    checkSession,
  ]);

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
