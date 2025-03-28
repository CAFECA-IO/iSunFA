// Info: (20241107 - Liz) 角色 id 的概念，用來區分不同的角色，但與後端給的 Role id 不同
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
  COMPANY = 'COMPANY',
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}
