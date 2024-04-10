/* eslint-disable */
import { client } from '@passwordless-id/webauthn';

import useStateRef from 'react-usestateref';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { ICredential, IUserAuth } from '../interfaces/webauthn';
import { checkFIDO2Cookie, createChallenge } from '../lib/utils/authorization';
import { DUMMY_TIMESTAMP } from '../constants/config';
import { DEFAULT_USER_NAME } from '../constants/display';
import { ISUNFA_API } from '../constants/url';

interface SignUpProps {
  username?: string;
}

interface UserContextType {
  credential: ICredential | null;
  signUp: ({ username }: SignUpProps) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  userAuth: IUserAuth | null;
}

export const UserContext = createContext<UserContextType>({
  credential: {} as ICredential,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  userAuth: {} as IUserAuth,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [credential, setCredential, credentialRef] = useStateRef<ICredential | null>(null);
  const [userAuth, setUserAuth, userAuthRef] = useStateRef<IUserAuth | null>(null);

  const signUp = async ({ username }: SignUpProps) => {
    const name = username || DEFAULT_USER_NAME;
    console.log('signUp called');

    try {
      // const preflight = await fetch(ISUNFA_API.SIGN_UP, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ test: name }),
      // });

      // console.log('prefight:', preflight);

      const newChallenge = await createChallenge(
        'FIDO2.TEST.reg-' + DUMMY_TIMESTAMP.toString() + '-hello'
      );

      const registration = await client.register(name, newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        attestation: true,
        userHandle: 'iSunFA-', // TODO: optional userId less than 64 bytes (20240403 - Shirley)
        debug: false,
        // discoverable: 'required', // TODO: to fix/limit user to login with the same public-private key pair (20240410 - Shirley)
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

      setUserAuth(data);
      setCredential(credential);

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

      const newChallenge = await createChallenge(
        'FIDO2.TEST.reg-' + DUMMY_TIMESTAMP.toString() + '-hello'
      );

      const authentication = await client.authenticate([], newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        debug: false,
      });

      console.log('in signIn, authentication:', authentication);

      // const rs = await fetch(ISUNFA_API.SIGN_IN, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ authentication }),
      // });

      // const data = (await rs.json()).payload;

      // console.log('in signIn, rs:', rs);

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

      setCredential(null);
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
    }
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
    }),
    [credentialRef.current]
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
