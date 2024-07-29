import { AuthFunctions } from '@/interfaces/auth';

export const AuthFunctionsKeyStr: { [K in keyof AuthFunctions]: K } = {
  user: 'user',
  admin: 'admin',
  owner: 'owner',
  superAdmin: 'superAdmin',
  CompanyAdminMatch: 'CompanyAdminMatch',
  invitation: 'invitation',
  projectCompanyMatch: 'projectCompanyMatch',
};
