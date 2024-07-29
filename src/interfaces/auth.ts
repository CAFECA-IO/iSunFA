import { Invitation } from '@prisma/client';

export interface AuthFunctions {
  user: (params: { userId: number }) => Promise<boolean>;
  admin: (params: { userId: number; companyId: number }) => Promise<boolean>;
  CompanyAdminMatch: (params: { companyId: number; adminId: number }) => Promise<boolean>;
  invitation: (params: { invitation: Invitation }) => Promise<boolean>;
  projectCompanyMatch: (params: { projectId: number; companyId: number }) => Promise<boolean>;
}

// type AuthFunctions = typeof authFunctions;
export type AuthFunctionsKeys = keyof AuthFunctions;
type AuthFunctionsParams = {
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
