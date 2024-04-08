import { client } from '@passwordless-id/webauthn';

import useStateRef from 'react-usestateref';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { ICredential } from '../interfaces/webauthn';
import { checkFIDO2Cookie, createChallenge } from '../lib/utils/authorization';
import { DUMMY_TIMESTAMP, ISUNFA_API } from '../constants/config';

interface UserContextType {
  user: ICredential | null;
  setUser: (user: ICredential) => void;
  signUp: () => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: {} as ICredential,
  setUser: () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser, userRef] = useStateRef<ICredential | null>(null);

  const signUp = async () => {
    try {
      const newChallenge = await createChallenge(
        'FIDO2.TEST.reg-' + DUMMY_TIMESTAMP.toString() + '-hello'
      );

      const registration = await client.register('User', newChallenge, {
        authenticatorType: 'both',
        userVerification: 'required',
        timeout: 60000, // Info: 60 seconds (20240408 - Shirley)
        attestation: true,
        userHandle: 'iSunFA-', // TODO: optional userId less than 64 bytes (20240403 - Shirley)
        debug: false,
      });

      const rs = await fetch(ISUNFA_API.SIGN_UP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registration }),
      });

      const data = (await rs.json()).payload as ICredential;

      setUser(data);
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
        body: JSON.stringify({ credential: user }),
      });

      setUser(null);
    } catch (error) {
      // Deprecated: dev (20240410 - Shirley)
      // eslint-disable-next-line no-console
      console.error('signOut error:', error);
    }
  };

  const setPrivateData = async () => {
    const credential = checkFIDO2Cookie();
    // eslint-disable-next-line no-console
    console.log('in userContext, credential:', credential);

    /* TODO: verify the cookie content (20240408 - Shirley)
    // const expected = {
    //   challenge: DUMMY_CHALLENGE,
    //   origin: 'http://localhost:3000',
    //   userVerified: true,
    //   verbose: true,
    // };

    // const auth = await server.verifyAuthentication();
    */

    if (credential) {
      setUser(credential[0]);
    }

    // eslint-disable-next-line no-console
    console.log('userRef.current:', userRef.current, 'if credential:', !!credential);
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
    () => ({ user: userRef.current, setUser, signUp, signOut }),
    [userRef.current]
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
