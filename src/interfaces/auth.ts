import { AuthFunctionsKeysNew } from '@/constants/auth';
import { ISessionData } from '@/interfaces/session';
import { NextApiRequest } from 'next';

export enum AuthFunctionsKeys {
  user = 'user',
  owner = 'owner',
  superAdmin = 'superAdmin',
  AccountBookAdminMatch = 'AccountBookAdminMatch',
  projectAccountBookMatch = 'projectAccountBookMatch',
}

export type AuthFunctionsNew = {
  [key in AuthFunctionsKeysNew]: (session: ISessionData, req: NextApiRequest) => Promise<boolean>;
};

export interface AuthFunctions {
  [AuthFunctionsKeys.user]: (params: { userId: number }) => Promise<boolean>;
  [AuthFunctionsKeys.owner]: (params: {
    userId: number;
    accountBookId: number;
  }) => Promise<boolean>;
  [AuthFunctionsKeys.superAdmin]: (params: {
    userId: number;
    accountBookId: number;
  }) => Promise<boolean>;
  [AuthFunctionsKeys.AccountBookAdminMatch]: (params: {
    accountBookId: number;
    adminId: number;
  }) => Promise<boolean>;
  [AuthFunctionsKeys.projectAccountBookMatch]: (params: {
    projectId: number;
    accountBookId: number;
  }) => Promise<boolean>;
}

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
