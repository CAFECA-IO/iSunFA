import { Invitation } from '@prisma/client';

export enum AuthFunctionsKeys {
  user = 'user',
  admin = 'admin',
  owner = 'owner',
  superAdmin = 'superAdmin',
  CompanyAdminMatch = 'CompanyAdminMatch',
  invitation = 'invitation',
  projectCompanyMatch = 'projectCompanyMatch',
}

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
  [AuthFunctionsKeys.invitation]: (params: { invitation: Invitation }) => Promise<boolean>;
  [AuthFunctionsKeys.projectCompanyMatch]: (params: {
    projectId: number;
    companyId: number;
  }) => Promise<boolean>;
}

export type AuthFunctionsParams = {
  [K in AuthFunctionsKeys]: Parameters<AuthFunctions[K]>[0];
};

// 提取所有检查函数的参数类型
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
export type AllRequiredParams<T extends AuthFunctionsKeys[]> = UnionToIntersection<
  AuthFunctionsParams[T[number]]
>;
