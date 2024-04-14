/* eslint-disable */
import { client, utils } from '@passwordless-id/webauthn';

import useStateRef from 'react-usestateref';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { ICredential, IUserAuth } from '../interfaces/webauthn';
import { checkFIDO2Cookie, createChallenge } from '../lib/utils/authorization';
import { DUMMY_TIMESTAMP, FIDO2_USER_HANDLE } from '../constants/config';
import { DEFAULT_DISPLAYED_USER_NAME } from '../constants/display';
import { ISUNFA_API } from '../constants/url';
import { AuthenticationEncoded } from '@passwordless-id/webauthn/dist/esm/types';

interface SignUpProps {
  username?: string;
}

interface UserContextType {
  credential: ICredential | null;
  signUp: ({ username }: SignUpProps) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  userAuth: IUserAuth | null;
  username: string | null;
  signedIn: boolean;
}

export const UserContext = createContext<UserContextType>({
  credential: {} as ICredential,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  userAuth: {} as IUserAuth,
  username: '',
  signedIn: false,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [signedIn, setSignedIn, signedInRef] = useStateRef(false);
  const [credential, setCredential, credentialRef] = useStateRef<ICredential | null>(null);
  const [userAuth, setUserAuth, userAuthRef] = useStateRef<IUserAuth | null>(null);
  const [username, setUsername, usernameRef] = useStateRef<string | null>(null);

  const signUp = async ({ username }: SignUpProps) => {
    const name = username || DEFAULT_DISPLAYED_USER_NAME;
    console.log('signUp called');

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

      const data = (await rs.json()).payload as IUserAuth;
      const credential = data.credential as ICredential;

      setUsername(data.username);
      setUserAuth(data);
      setCredential(credential);
      setSignedIn(true);

      // TODO: workaround for demo for registration (20240409 - Shirley)
      if (data) {
        const registrationArray = JSON.parse(localStorage.getItem('registrationArray') || '[]');
        registrationArray.push(data);
        localStorage.setItem('registrationArray', JSON.stringify(registrationArray));
      }
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
    console.log('signIn called');
    try {
      // const signInClickHandler = async () => {
      //   const challenge = 'RklETzIuVEVTVC5yZWctMTcxMjE3Njg1MC1oZWxsbw';
      //   const authentication = await client.authenticate([], challenge, {
      //     authenticatorType: 'both',
      //     userVerification: 'required',
      //     timeout: 60000,
      //   });

      //   const isSignedIn = await fetch(ISUNFA_API.SIGN_IN, {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({ authentication }),
      //   });
      //   // eslint-disable-next-line no-console
      //   console.log('authentication', authentication);
      // };

      /* TODO: get user from localStorage (20240409 - Shirley)
      // const getRegisteredUser = JSON.parse(localStorage.getItem('registrationArray') || '[]');
      // const user = getRegisteredUser.find(
      //   (u: IUserAuth) => u.username === DEFAULT_USER_NAME
      // ) as IUserAuth;
      // console.log('user in signIn:', user);
      */

      const newChallenge = await createChallenge(
        'FIDO2.TEST.reg-' + DUMMY_TIMESTAMP.toString() + '-hello'
      );

      const authentication: AuthenticationEncoded = await client.authenticate([], newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        debug: false,
      });

      console.log('in signIn, authentication:', authentication);

      /* TODO: get user from localStorage (20240409 - Shirley)
      if (!!user) {
        const existChallenge = user.client.challenge;
        const originArrayBuffer = utils.parseBase64url(existChallenge);
        const originChallenge = utils.parseBuffer(originArrayBuffer);
        const originTimestamp = originChallenge.split('-')[1];
        // eslint-disable-next-line no-console
        console.log('originTimestamp:', originTimestamp);
      }
      */

      // TODO: uncomment
      if (authentication) {
        // const { credential } = user;
        // setUsername(user.username);
        setCredential({} as ICredential);
        setSignedIn(true);
        writeCookie();
      }

      // const registration = await client.register(DEFAULT_USER_NAME, newChallenge, {
      //   authenticatorType: 'both',
      //   userVerification: 'required',
      //   timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
      //   attestation: true,
      //   userHandle: 'iSunFA-', // TODO: optional userId less than 64 bytes (20240403 - Shirley)
      //   debug: false,
      // });

      // // TODO: refactor the signIn function (20240409 - Shirley)
      // const rs = await fetch(ISUNFA_API.SIGN_UP, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ registration }),
      // });

      // const data = (await rs.json()).payload as IUserAuth;
      // const credential = data.credential as ICredential;

      // setUserAuth(data);
      // setCredential(credential);
    } catch (error) {
      // Deprecated: dev (20240410 - Shirley)
      // eslint-disable-next-line no-console
      console.error('signUp error:', error);
    }
  };

  const signOut = async () => {
    try {
      await fetch(ISUNFA_API.SIGN_OUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential }),
      });

      setUserAuth(null);
      setUsername(null);
      setCredential(null);
      setSignedIn(false);
    } catch (error) {
      // Deprecated: dev (20240410 - Shirley)
      // eslint-disable-next-line no-console
      console.error('signOut error:', error);
    }
  };

  // TODO: 在用戶一進到網站後就去驗證是否登入 (20240409 - Shirley)
  const setPrivateData = async () => {
    const credentialFromCookie = checkFIDO2Cookie();
    // eslint-disable-next-line no-console
    console.log('in userContext, credential:', credentialFromCookie);

    /* TODO: verify the cookie content (20240408 - Shirley)
    // const expected = {
    //   challenge: DUMMY_CHALLENGE,
    //   origin: 'http://localhost:3000',
    //   userVerified: true,
    //   verbose: true,
    // };

    // const auth = await server.verifyAuthentication();
    */

    if (credentialFromCookie) {
      setCredential(credentialFromCookie[0]);
      setSignedIn(true);

      console.log('in setPrivateData, credential:', credentialRef.current);
    }
  };

  const readCookie = async () => {
    const cookie = document.cookie.split('; ').find((row: string) => row.startsWith('FIDO2='));

    const FIDO2 = cookie ? cookie.split('=')[1] : null;

    if (FIDO2) {
      const decoded = decodeURIComponent(FIDO2);
      const credential = JSON.parse(decoded) as ICredential;
      return credential;
    }

    return null;
  };

  const writeCookie = async () => {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);

    const credential = await readCookie();
    console.log('credential:', credential);
    // const credentialArray =

    document.cookie = `FIDO2=${encodeURIComponent(JSON.stringify(credentialRef.current))}; expires=${expiration.toUTCString()}; path=/`;
  };

  const init = async () => {
    await setPrivateData();
    const result = await Promise.resolve();
    return result;
  };

  useEffect(() => {
    (async () => {
      await init();
    })();
  }, []);

  const value = useMemo(
    () => ({
      credential: credentialRef.current,
      signUp,
      signIn,
      signOut,
      userAuth: userAuthRef.current,
      username: usernameRef.current,
      signedIn: signedInRef.current,
    }),
    [credentialRef.current]
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
