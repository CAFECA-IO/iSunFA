import { AuthFunctionsKeys } from '@/constants/auth';
import { ISessionData } from '@/interfaces/session_data';
import { NextApiRequest } from 'next';

export type AuthFunctions = {
  [key in AuthFunctionsKeys]: (session: ISessionData, req: NextApiRequest) => Promise<boolean>;
};

export type AuthFunctionsParams = {
  [K in AuthFunctionsKeys]: Parameters<AuthFunctions[K]>[0];
};

// Info: (20240710 - Jacky) 提取所有檢查函數的參數類型
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
export type AllRequiredParams<T extends AuthFunctionsKeys[]> = UnionToIntersection<
  AuthFunctionsParams[T[number]]
>;
