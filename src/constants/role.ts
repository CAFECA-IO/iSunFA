// Info: (20241107 - Liz) 角色 id 的概念，用來區分不同的角色，但與後端給的 Role id 不同
export enum RoleName {
  BOOKKEEPER = 'Bookkeeper', // Info: (20241107 - Liz) Bookkeeper = 1006
  EDUCATIONAL_TRIAL_VERSION = 'Educational Trial Version', // Info: (20241107 - Liz) Educational Trial Version = 1008
  ENTERPRISE = 'Enterprise', // Info: (20250206 - Liz) Enterprise = 1009
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
