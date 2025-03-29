// Deprecated: (20250328 - Liz) 預計刪除 IRole
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

// Info: (20250328 - Liz) RoleType 由原先的 Capital Case 改為 CONSTANT_CASE
export enum RoleType {
  COMPANY = 'COMPANY',
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}
