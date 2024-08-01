import { client } from '@passwordless-id/webauthn';
import useStateRef from 'react-usestateref';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toast as toastify } from 'react-toastify';
// import { createChallenge } from '@/lib/utils/authorization';
import { FREE_COMPANY_ID } from '@/constants/config';
import { DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';
import { ISUNFA_ROUTE } from '@/constants/url';
import { AuthenticationEncoded } from '@passwordless-id/webauthn/dist/esm/types';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ICompany, ICompanyAndRole } from '@/interfaces/company';
import { IUser } from '@/interfaces/user';

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
  isSignInError: boolean;
  selectedCompany: ICompany | null;
  selectCompany: (company: ICompany | null, isPublic?: boolean) => Promise<void>;
  successSelectCompany: boolean | undefined;
  errorCode: string | null;
  toggleIsSignInError: () => void;
  isAuthLoading: boolean;
  returnUrl: string | null;
  clearReturnUrl: () => void;
  checkIsRegistered: () => Promise<{
    isRegistered: boolean;
    credentials: PublicKeyCredential | null;
  }>;
  handleExistingCredential: (
    credentials: PublicKeyCredential,
    invitation: string | undefined
  ) => Promise<void>;
}

export const UserContext = createContext<UserContextType>({
  credential: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: () => {},
  userAuth: null,
  username: null,
  signedIn: false,
  isSignInError: false,
  selectedCompany: null,
  selectCompany: async () => {},
  successSelectCompany: undefined,
  errorCode: null,
  toggleIsSignInError: () => {},
  isAuthLoading: true,
  returnUrl: null,
  clearReturnUrl: () => {},
  checkIsRegistered: async () => {
    return { isRegistered: false, credentials: null };
  },
  handleExistingCredential: async () => {},
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

  const { trigger: signOutAPI } = APIHandler<void>(APIName.SIGN_OUT, {
    body: { credential: credentialRef.current },
  });
  const { trigger: createChallengeAPI } = APIHandler<string>(APIName.CREATE_CHALLENGE);
  const { trigger: signInAPI } = APIHandler<IUser>(APIName.SIGN_IN);
  const { trigger: signUpAPI } = APIHandler<IUser>(APIName.SIGN_UP);
  const { trigger: selectCompanyAPI } = APIHandler<ICompany>(APIName.COMPANY_SELECT);
  const { trigger: getCompanyAPI } = APIHandler<ICompanyAndRole>(APIName.COMPANY_GET);
  const { trigger: getUserSessionData } = APIHandler<{ user: IUser; company: ICompany }>(
    APIName.SESSION_GET
  );

  const toggleIsSignInError = () => {
    setIsSignInError(!isSignInErrorRef.current);
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
        setCredential(signInData.credentialId);
        setSignedIn(true);
        setIsSignInError(false);
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
        setCredential(signUpData.credentialId);
        setSignedIn(true);
        setIsSignInError(false);
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

  // Info: 在用戶一進到網站後就去驗證是否登入 (20240409 - Shirley)
  const setPrivateData = async () => {
    setIsAuthLoading(true);
    const {
      data: userSessionData,
      success: getUserSessionSuccess,
      code: getUserSessionCode,
    } = await getUserSessionData();
    setIsAuthLoading(false);
    if (getUserSessionSuccess) {
      if (userSessionData) {
        if (
          'user' in userSessionData &&
          userSessionData.user &&
          Object.keys(userSessionData.user).length > 0
        ) {
          setUserAuth(userSessionData.user);
          setUsername(userSessionData.user.name);
          setCredential(userSessionData.user.credentialId);
          setSignedIn(true);
          setIsSignInError(false);
        } else {
          setSignedIn(false);
        }
        if ('company' in userSessionData && Object.keys(userSessionData.company).length > 0) {
          setSuccessSelectCompany(true);
          setSelectedCompany(userSessionData.company);
        }
      }
    }
    if (getUserSessionSuccess === false) {
      setSignedIn(false);
      setIsSignInError(true);
      setErrorCode(getUserSessionCode ?? '');
      setSuccessSelectCompany(undefined);
      setSelectedCompany(null);
    }
  };

  const clearReturnUrl = () => {
    setReturnUrl(null);
  };

  const handleReturnUrl = () => {
    if (returnUrl) {
      const urlString = decodeURIComponent(returnUrl);
      clearReturnUrl();
      router.push(urlString);
    } else {
      router.push(ISUNFA_ROUTE.DASHBOARD);
    }
  };

  // Info: (20240729 - tzuhan) un-used function
  const getCompanyHandler = async (companyId: number) => {
    const { success, code, data } = await getCompanyAPI({
      params: {
        companyId,
      },
    });
    if (success && data?.company) {
      setSelectedCompany(data.company);
      setSuccessSelectCompany(true);
      handleReturnUrl();
    }
    if (success === false) {
      setErrorCode(code ?? '');
      setSuccessSelectCompany(false);
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
        companyId: !company && !isPublic ? -1 : company?.id ?? FREE_COMPANY_ID,
      },
    });

    if (!company && !isPublic) {
      return;
    }
    await handleSelectCompanyResponse(res);
  };

  const clearState = () => {
    setUserAuth(null);
    setUsername(null);
    setCredential(null);
    setSignedIn(false);
    setIsSignInError(false);
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);

    toastify.dismiss(); // Info: (20240513 - Julian) 清除所有的 Toast
  };

  const init = async () => {
    await setPrivateData();
    const result = await Promise.resolve();
    return result;
  };

  const signOut = async () => {
    signOutAPI();
    clearState();
    router.push(ISUNFA_ROUTE.LOGIN);
  };

  useEffect(() => {
    (async () => {
      await init();
    })();
  }, []);

  // Info: 在瀏覽器被重新整理後，如果沒有登入，就 redirect to login page (20240530 - Shirley)
  useEffect(() => {
    if (!signedIn) {
      if (router.pathname.startsWith('/users') && !router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
        if (router.pathname !== ISUNFA_ROUTE.SELECT_COMPANY) {
          setReturnUrl(encodeURIComponent(router.asPath));
        }
        router.push(ISUNFA_ROUTE.LOGIN);
      }
    }
  }, [signedIn, router]);

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
      isSignInError: isSignInErrorRef.current,
      selectedCompany: selectedCompanyRef.current,
      selectCompany,
      successSelectCompany: successSelectCompanyRef.current,
      errorCode: errorCodeRef.current,
      toggleIsSignInError,
      isAuthLoading: isAuthLoadingRef.current,
      returnUrl: returnUrlRef.current,
      clearReturnUrl,
      getCompanyHandler,
      checkIsRegistered,
      handleExistingCredential,
    }),
    [
      credentialRef.current,
      selectedCompanyRef.current,
      successSelectCompanyRef.current,
      errorCodeRef.current,
      isSignInErrorRef.current,
      isAuthLoadingRef.current,
      returnUrlRef.current,
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
