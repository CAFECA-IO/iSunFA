import { AuthFunctionsKeysNew } from '@/constants/auth';
import { ISessionData } from '@/interfaces/session_data';
import { NextApiRequest } from 'next';

export enum AuthFunctionsKeys {
  user = 'user',
  admin = 'admin',
  owner = 'owner',
  superAdmin = 'superAdmin',
  CompanyAdminMatch = 'CompanyAdminMatch',
  projectCompanyMatch = 'projectCompanyMatch',
}

export type AuthFunctionsNew = {
  [key in AuthFunctionsKeysNew]: (session: ISessionData, req: NextApiRequest) => Promise<boolean>;
};

export interface AuthFunctions {
  [AuthFunctionsKeys.user]: (params: { userId: number }) => Promise<boolean>;
  [AuthFunctionsKeys.admin]: (params: { userId: number; companyId: number }) => Promise<boolean>;
  [AuthFunctionsKeys.owner]: (params: { userId: number; companyId: number }) => Promise<boolean>;
  [AuthFunctionsKeys.superAdmin]: (params: {
    userId: number;
    companyId: number;
  }) => Promise<boolean>;
  [AuthFunctionsKeys.CompanyAdminMatch]: (params: {
    companyId: number;
    adminId: number;
  }) => Promise<boolean>;
  [AuthFunctionsKeys.projectCompanyMatch]: (params: {
    projectId: number;
    companyId: number;
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
