import { client } from '@passwordless-id/webauthn';
import useStateRef from 'react-usestateref';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toast as toastify } from 'react-toastify';
import { createChallenge } from '@/lib/utils/authorization';
import { DUMMY_TIMESTAMP, FIDO2_USER_HANDLE } from '@/constants/config';
import { DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';
import { ISUNFA_ROUTE } from '@/constants/url';
import { AuthenticationEncoded } from '@passwordless-id/webauthn/dist/esm/types';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ICompany } from '@/interfaces/company';
import { IUser } from '@/interfaces/user';
import { ISessionData } from '@/interfaces/session_data';

interface SignUpProps {
  username?: string;
}

interface UserContextType {
  credential: string | null;
  signUp: ({ username }: SignUpProps) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => void;
  userAuth: IUser | null;
  username: string | null;
  signedIn: boolean;
  isSignInError: boolean;
  selectedCompany: ICompany | null;
  selectCompany: (company: ICompany | null) => void;
  successSelectCompany: boolean | undefined;
  errorCode: string | null;
  toggleIsSignInError: () => void;
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
  selectCompany: () => {},
  successSelectCompany: undefined,
  errorCode: null,
  toggleIsSignInError: () => {},
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

  const { trigger: signOutAPI } = APIHandler<void>(
    APIName.SIGN_OUT,
    {
      body: { credential: credentialRef.current },
    },
    false,
    false
  );

  const {
    trigger: signInAPI,
    data: signInData,
    success: signInSuccess,
    isLoading: isSignInLoading,
    code: signInCode,
  } = APIHandler<IUser>(
    APIName.SIGN_IN,
    {
      header: { 'Content-Type': 'application/json' },
    },
    false,
    false
  );

  const {
    trigger: signUpAPI,
    data: signUpData,
    success: signUpSuccess,
    isLoading: isSignUpLoading,
    code: signUpCode,
  } = APIHandler<IUser>(
    APIName.SIGN_UP,
    {
      header: { 'Content-Type': 'application/json' },
    },
    false,
    false
  );

  const {
    trigger: selectCompanyAPI,
    success: companySelectSuccess,
    code: companySelectCode,
  } = APIHandler<string>(APIName.COMPANY_SELECT, {}, false, false);

  const {
    trigger: getUserSessionData,
    data: userSessionData,
    error: getUserSessionError,
    success: getUserSessionSuccess,
    isLoading: isGetUserSessionLoading,
    code: getUserSessionCode,
  } = APIHandler<ISessionData>(APIName.SESSION_GET, {}, false, false);

  const toggleIsSignInError = () => {
    setIsSignInError(!isSignInErrorRef.current);
  };

  const signUp = async ({ username: usernameForSignUp }: SignUpProps) => {
    const name = usernameForSignUp || DEFAULT_DISPLAYED_USER_NAME;

    try {
      setIsSignInError(false);

      const newChallenge = await createChallenge(
        'FIDO2.TEST.reg-' + DUMMY_TIMESTAMP.toString() + '-hello'
      );

      const registration = await client.register(name, newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        attestation: true,
        userHandle: FIDO2_USER_HANDLE, // Info: optional userId less than 64 bytes (20240403 - Shirley)
        debug: false,
        discoverable: 'required', // TODO: to fix/limit user to login with the same public-private key pair (20240410 - Shirley)
      });

      signUpAPI({ body: { registration } });
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
  const signIn = async () => {
    try {
      setIsSignInError(false);

      const newChallenge = await createChallenge(
        'FIDO2.TEST.reg-' + DUMMY_TIMESTAMP.toString() + '-hello'
      );

      const authentication: AuthenticationEncoded = await client.authenticate([], newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        debug: false,
      });

      signInAPI({ body: { authentication, challenge: newChallenge } });
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
    getUserSessionData();
  };

  // Info: (20240513 - Julian) 選擇公司的功能
  const selectCompany = (company: ICompany | null) => {
    if (!company) {
      setSelectedCompany(null);
      setSuccessSelectCompany(undefined);
      return;
    }
    setSelectedCompany(company);
    selectCompanyAPI({
      params: {
        companyId: company.id,
      },
    });
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
    signOutAPI(); // TODO: signOutAPI to delete the session (20240524 - Shirley)
    clearState();
    router.push(ISUNFA_ROUTE.LOGIN);
  };

  useEffect(() => {
    (async () => {
      await init();
    })();
  }, []);

  useEffect(() => {
    if (isSignUpLoading) return;

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
  }, [signUpData, isSignUpLoading, signUpSuccess, signUpCode]);

  useEffect(() => {
    if (isSignInLoading) return;

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
  }, [signInData, isSignInLoading, signInSuccess, signInCode]);

  // Info: 在瀏覽器被重新整理後，如果沒有登入，就 redirect to login page (20240530 - Shirley)
  useEffect(() => {
    if (!signedIn && !isGetUserSessionLoading) {
      if (router.pathname.startsWith('/users') && !router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
        router.push(ISUNFA_ROUTE.LOGIN);
      }
    }
  }, [signedIn, isGetUserSessionLoading]);

  useEffect(() => {
    if (isGetUserSessionLoading) return;

    // Deprecated: dev (20240601 - Shirley)
    // eslint-disable-next-line no-console
    console.log('userSessionData:', userSessionData);

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
        }
        if ('company' in userSessionData && Object.keys(userSessionData.company).length > 0) {
          setSuccessSelectCompany(true);
          setSelectedCompany(userSessionData.company);
        }
      }
    }
    if (getUserSessionSuccess === false) {
      setIsSignInError(true);
      // Deprecated: dev (20240601 - Shirley)
      // eslint-disable-next-line no-console
      console.log('getUserSessionError:', getUserSessionError);
      setErrorCode(getUserSessionCode ?? '');
      setSuccessSelectCompany(undefined);
      setSelectedCompany(null);
    }
  }, [userSessionData, isGetUserSessionLoading, getUserSessionSuccess, getUserSessionCode]);

  useEffect(() => {
    if (companySelectSuccess) {
      setSuccessSelectCompany(true);
    }
    if (companySelectSuccess === false) {
      setSelectedCompany(null);
      setSuccessSelectCompany(false);
      setErrorCode(companySelectCode ?? '');
    }
  }, [companySelectSuccess, companySelectCode]);

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
    }),
    [
      credentialRef.current,
      selectedCompanyRef.current,
      successSelectCompanyRef.current,
      errorCodeRef.current,
      isSignInErrorRef.current,
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
