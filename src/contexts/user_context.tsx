import { client } from '@passwordless-id/webauthn';
import useStateRef from 'react-usestateref';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
// import { toast as toastify } from 'react-toastify';
// import { createChallenge } from '@/lib/utils/authorization';
import { FREE_COMPANY_ID } from '@/constants/config';
import { DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';
import { ISUNFA_ROUTE } from '@/constants/url';
import { AuthenticationEncoded } from '@passwordless-id/webauthn/dist/esm/types';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ICompany } from '@/interfaces/company';
import { IUser } from '@/interfaces/user';
import { throttle } from '@/lib/utils/common';
import { Provider } from '@/constants/provider';
import { signIn as authSignIn, signOut as authSignOut } from 'next-auth/react';
import { ILoginPageProps } from '@/interfaces/page_props';
import { Hash } from '@/constants/hash';

interface SignUpProps {
  username?: string;
  invitation?: string;
}

interface UserContextType {
  credential: string | null;
  signUp: ({ username, invitation }: SignUpProps) => Promise<void>;
  signIn: ({ invitation }: { invitation?: string }) => Promise<void>;
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
  handleExistingCredential: (
    credentials: PublicKeyCredential,
    invitation: string | undefined
  ) => Promise<void>;

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
  signUp: async () => {},
  signIn: async () => {},
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
  handleExistingCredential: async () => {},

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
  const { trigger: signInAPI } = APIHandler<IUser>(APIName.SIGN_IN);
  const { trigger: signUpAPI } = APIHandler<IUser>(APIName.SIGN_UP);
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

  // Info: 在瀏覽器被重新整理後，如果沒有登入，就 redirect to login page (20240530 - Shirley)
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

  const handleSignInAPIResponse = (response: {
    success: boolean;
    data: IUser | null;
    code: string;
    error: Error | null;
  }) => {
    setIsAuthLoading(false);
    const { data: signInData, success: signInSuccess, code: signInCode } = response;
    if (signInSuccess) {
      if (signInData) {
        setUsername(signInData.name);
        setUserAuth(signInData);
        setSignedIn(true);
        setIsSignInError(false);
        handleSignInRoute();
      }
    }
    if (signInSuccess === false) {
      setIsSignInError(true);
      setErrorCode(signInCode ?? '');
    }
  };

  const handleExistingCredential = async (
    credentials: PublicKeyCredential,
    invitation: string | undefined
  ) => {
    try {
      const { id, response } = credentials;
      if (response instanceof AuthenticatorAssertionResponse) {
        const { authenticatorData, clientDataJSON, signature, userHandle } = response;

        const authentication: AuthenticationEncoded = {
          credentialId: id,
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(authenticatorData))),
          clientData: btoa(String.fromCharCode(...new Uint8Array(clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
          userHandle: userHandle
            ? btoa(String.fromCharCode(...new Uint8Array(userHandle)))
            : undefined,
        };

        let signInResponse: {
          success: boolean;
          data: IUser | null;
          code: string;
          error: Error | null;
        };
        setIsAuthLoading(true);
        if (invitation) {
          signInResponse = await signInAPI({ body: { authentication }, query: { invitation } });
        } else {
          signInResponse = await signInAPI({ body: { authentication } });
        }
        handleSignInAPIResponse(signInResponse);
      } else {
        throw new Error('Invalid response type: Expected AuthenticatorAssertionResponse');
      }
    } catch (error) {
      // Deprecated: dev (20240730 - Tzuhan)
      // eslint-disable-next-line no-console
      console.error('handleExistingCredential error:', error);
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

  const handleSignUpAPIResponse = (response: {
    success: boolean;
    data: IUser | null;
    code: string;
    error: Error | null;
  }) => {
    setIsAuthLoading(false);
    const { data: signUpData, success: signUpSuccess, code: signUpCode } = response;
    if (signUpSuccess) {
      if (signUpData) {
        setUsername(signUpData.name);
        setUserAuth(signUpData);
        setSignedIn(true);
        setIsSignInError(false);
        handleSignInRoute();
      }
    }
    if (signUpSuccess === false) {
      setIsSignInError(true);
      setErrorCode(signUpCode ?? '');
    }
  };

  const signUp = async ({ username: usernameForSignUp, invitation }: SignUpProps) => {
    try {
      const name = usernameForSignUp || DEFAULT_DISPLAYED_USER_NAME;
      setIsSignInError(false);

      const { data: newChallenge, success, code } = await createChallengeAPI();

      if (!success || !newChallenge) {
        setErrorCode(code);
        return;
      }

      // Info: (20240730 - Tzuhan) 生成 userHandle
      const userHandleArray = new Uint8Array(32);
      window.crypto.getRandomValues(userHandleArray);
      const userHandle = btoa(String.fromCharCode(...userHandleArray));

      const registration = await client.register(name, newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        attestation: true,
        userHandle, // Info: optional userId less than 64 bytes (20240403 - Shirley)
        debug: false,
        discoverable: 'required', // TODO: to fix/limit user to login with the same public-private key pair (20240410 - Shirley)
      });

      let signUpResponse: {
        success: boolean;
        data: IUser | null;
        code: string;
        error: Error | null;
      };
      setIsAuthLoading(true);
      if (invitation) {
        signUpResponse = await signUpAPI({ body: { registration }, query: { invitation } });
      } else {
        signUpResponse = await signUpAPI({ body: { registration } });
      }
      handleSignUpAPIResponse(signUpResponse);
    } catch (error) {
      // Deprecated: dev (20240410 - Shirley)
      // eslint-disable-next-line no-console
      console.error('signUp error:', error);
    }
  };

  // TODO: refactor the signIn function (20240409 - Shirley)
  /* TODO: (20240410 - Shirley)
      拿登入聲明書 / 用戶條款 / challenge
      先檢查 cookie ，然後檢查是否有 credential 、驗證 credential 有沒有過期或亂寫，
      拿著 credential 跟 server 去拿 member 資料、付錢資料
  */
  const signIn = async ({ invitation }: { invitation?: string }) => {
    try {
      setIsSignInError(false);

      const { data: newChallenge, success, code } = await createChallengeAPI();

      if (!success || !newChallenge) {
        setErrorCode(code);
        return;
      }
      const authentication: AuthenticationEncoded = await client.authenticate([], newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        debug: false,
      });

      let signInResponse: {
        success: boolean;
        data: IUser | null;
        code: string;
        error: Error | null;
      };
      setIsAuthLoading(true);
      if (invitation) {
        signInResponse = await signInAPI({ body: { authentication }, query: { invitation } });
      } else {
        signInResponse = await signInAPI({ body: { authentication } });
      }
      handleSignInAPIResponse(signInResponse);
    } catch (error) {
      // Deprecated: dev (20240410 - Shirley)
      // eslint-disable-next-line no-console
      console.error('signIn error and try to call singUp function:', error);
      // signUp({ username: '' });

      if (!(error instanceof DOMException)) {
        setIsSignInError(true);

        throw new Error('signIn error thrown in userCtx');
      } else {
        throw new Error(`signIn error thrown in userCtx: ${error.message}`);
      }
    }
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

  // TODO: [Beta](20240819-Tzuhan) handle expiration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isJwtExpired = (expires: string | undefined) => {
    if (!expires) return true;
    const now = new Date();
    const expirationDate = new Date(expires);
    return now > expirationDate;
  };

  // Info: 在用戶一進到網站後就去驗證是否登入 (20240409 - Shirley)
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
      // TODO: [Beta](20240814-Tzuhan) [Beta](20240813-Tzuhan) handle error
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
        companyId: !company && !isPublic ? -1 : company?.id ?? FREE_COMPANY_ID,
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

  // Info: dependency array 的值改變，才會讓更新後的 value 傳到其他 components (20240522 - Shirley)
  const value = useMemo(
    () => ({
      credential: credentialRef.current,
      signUp,
      signIn,
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
      handleExistingCredential,
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
