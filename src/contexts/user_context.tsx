import { client } from '@passwordless-id/webauthn';
import useStateRef from 'react-usestateref';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toast as toastify } from 'react-toastify';
import { ICredential } from '@/interfaces/webauthn';
import { createChallenge } from '@/lib/utils/authorization';
import { COOKIE_NAME, DUMMY_TIMESTAMP, FIDO2_USER_HANDLE } from '@/constants/config';
import { DEFAULT_DISPLAYED_USER_NAME } from '@/constants/display';
import { ISUNFA_API, ISUNFA_ROUTE } from '@/constants/url';
import { AuthenticationEncoded } from '@passwordless-id/webauthn/dist/esm/types';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { IUser } from '@/interfaces/user';

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
  selectedCompany: string | null;
  selectCompany: (company: string) => void;
  isSelectCompany: boolean;
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
  isSelectCompany: false,
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
  const [selectedCompany, setSelectedCompany, selectedCompanyRef] = useStateRef<string | null>(
    null
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSelectCompany, setIsSelectCompany, isSelectCompanyRef] = useStateRef(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSignInError, setIsSignInError, isSignInErrorRef] = useStateRef(false);

  const { trigger: signOutAPI } = APIHandler<void>(
    APIName.SIGN_OUT,
    {
      body: { credential: credentialRef.current },
    },
    false,
    false
  );

  const readFIDO2Cookie = async () => {
    const cookie = document.cookie.split('; ').find((row: string) => row.startsWith('FIDO2='));

    const FIDO2 = cookie ? cookie.split('=')[1] : null;

    if (FIDO2) {
      const decoded = decodeURIComponent(FIDO2);
      const credentialData = JSON.parse(decoded) as ICredential;
      return credentialData;
    }

    return null;
  };

  const writeFIDO2Cookie = async () => {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);

    // TODO: read cookie first (20240520 - Shirley)
    // const credentialData = await readFIDO2Cookie();
    document.cookie = `FIDO2=${encodeURIComponent(JSON.stringify(credentialRef.current))}; expires=${expiration.toUTCString()}; path=/`;
  };

  const signUp = async ({ username: usernameForSignUp }: SignUpProps) => {
    const name = usernameForSignUp || DEFAULT_DISPLAYED_USER_NAME;

    try {
      const newChallenge = await createChallenge(
        'FIDO2.TEST.reg-' + DUMMY_TIMESTAMP.toString() + '-hello'
      );

      const registration = await client.register(name, newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        attestation: true,
        userHandle: FIDO2_USER_HANDLE, // TODO: optional userId less than 64 bytes (20240403 - Shirley)
        debug: false,
        discoverable: 'required', // TODO: to fix/limit user to login with the same public-private key pair (20240410 - Shirley)
      });

      const rs = await fetch(ISUNFA_API.SIGN_UP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registration }),
      });

      const data = (await rs.json()).payload as IUser;
      const newCredentialId = data.credentialId;

      setUsername(data.name);
      setUserAuth(data);
      setCredential(newCredentialId);
      setSignedIn(true);
      setIsSignInError(false);

      if (data) {
        writeFIDO2Cookie();
      }

      // eslint-disable-next-line no-console
      console.log('in userCtx, signUp, data:', data, 'registration:', registration);
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
      const newChallenge = await createChallenge(
        'FIDO2.TEST.reg-' + DUMMY_TIMESTAMP.toString() + '-hello'
      );

      const authentication: AuthenticationEncoded = await client.authenticate([], newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        debug: false,
      });
      /*
    const { authentication, registeredCredential, challenge } = req.body;

*/

      const rs = await fetch(ISUNFA_API.SIGN_IN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authentication, challenge: newChallenge }),
      });

      const data = (await rs.json()).payload as IUser;

      // eslint-disable-next-line no-console
      console.log('in userCtx, in signIn, rs:', rs, 'data:', data);

      // TODO: uncomment
      if (authentication) {
        // const { credential } = user;
        // setUsername(user.username);
        setUsername(data.name);
        setCredential(data.credentialId);
        setSignedIn(true);
        writeFIDO2Cookie();
      }

      // eslint-disable-next-line no-console
      console.log('in userCtx, in signIn, authentication:', authentication);
    } catch (error) {
      // Deprecated: dev (20240410 - Shirley)
      // eslint-disable-next-line no-console
      console.error('signIn error and try to call singUp function:', error);
      // signUp({ username: '' });
      setIsSignInError(true);
      if (!(error instanceof DOMException)) {
        throw new Error('signIn error thrown in userCtx');
      }
    }
  };

  // TODO: 在用戶一進到網站後就去驗證是否登入 (20240409 - Shirley)
  const setPrivateData = async () => {
    const credentialFromCookie = await readFIDO2Cookie();

    if (credentialFromCookie) {
      setCredential(credentialFromCookie.id);
      setSignedIn(true);
    }
  };

  // ToDo: (20240513 - Julian) 選擇公司的功能
  const selectCompany = (company: string) => {
    setSelectedCompany(company);
  };

  const clearState = () => {
    setUserAuth(null);
    setUsername(null);
    setCredential(null);
    setSignedIn(false);
    setIsSignInError(false);
    setSelectedCompany(null);
    setIsSelectCompany(false);

    toastify.dismiss(); // Info: (20240513 - Julian) 清除所有的 Toast
  };

  const init = async () => {
    await setPrivateData();
    const result = await Promise.resolve();
    return result;
  };

  const checkCookieAndSignOut = async () => {
    const cookie = await readFIDO2Cookie();

    if (!cookie) {
      clearState();
    } else {
      // TODO: send request with session cookie (20240520 - Shirley)
    }
  };

  const signOut = async () => {
    signOutAPI(); // Deprecated: 登出只需要在前端刪掉 cookie 就好 (20240517 - Shirley)
    clearState();
    router.push(ISUNFA_ROUTE.LOGIN);
    const cookieName = COOKIE_NAME.FIDO2;
    document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  };

  useEffect(() => {
    (async () => {
      await init();
    })();
  }, []);

  useEffect(() => {
    checkCookieAndSignOut();
  }, [router.pathname]);

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
      isSelectCompany: isSelectCompanyRef.current,
    }),
    [credentialRef.current]
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
