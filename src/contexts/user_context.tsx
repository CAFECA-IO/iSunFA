import { createContext, useContext, useMemo, useState } from 'react';
import { ICredential } from '../interfaces/webauthn';

interface UserContextType {
  user: ICredential;
  setUser: (user: ICredential) => void;
}

const UserContext = createContext<UserContextType>({
  user: {} as ICredential,
  setUser: () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ICredential>({} as ICredential);

  const value = useMemo(() => ({ user, setUser }), [user]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
