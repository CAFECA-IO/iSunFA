export interface IRole {
  id: number;
  name: string;
  permissions: string[];
  createdAt: number;
  updatedAt: number;
}

export enum RoleName {
  BOOKKEEPER = 'BOOKKEEPER',
  EDUCATIONAL_TRIAL_VERSION = 'EDUCATIONAL_TRIAL_VERSION',
  ENTERPRISE = 'ENTERPRISE',
}

export enum CompanyRoleName {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  OWNER = 'Owner',
  ACCOUNTANT = 'Accountant',
  BOOKKEEPER = 'Bookkeeper',
  FINANCE = 'Finance',
  VIEWER = 'Viewer',
  TEST = 'Test',
}

export enum RoleType {
  COMPANY = 'Company',
  USER = 'User',
  SYSTEM = 'System',
}
