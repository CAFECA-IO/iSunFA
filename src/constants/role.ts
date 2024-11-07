// Info: (20241007 - Liz) 角色 id 的概念，用來區分不同的角色，但與後端給的 Role id 不同
export enum RoleName {
  BOOKKEEPER = 'Bookkeeper',
  EDUCATIONAL_TRIAL_VERSION = 'Educational Trial Version',
  ACCOUNTANT = 'Accountant',
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
